import * as vscode from "vscode";
import * as fse from "../common/fsExtra";
import { IGlobWatcher, SimpleGlobWatcherConstructable as GlobWatcher } from "./globWatcher";
import { fromLogUri } from "./logUri";
import { ConfigService } from "./config";
import { NodeStringDecoder, StringDecoder } from "string_decoder";
import { getInstace } from "../common/container";
import { IConvDecoder } from "./iconvDecoder";

let TheBuffer: Buffer | undefined;

function getChunkSize(configSvc: ConfigService) {
    let chunkSize = configSvc.get("chunkSizeKb");
    if (!chunkSize || chunkSize <= 0) {
        chunkSize = 64;
    }
    return chunkSize * 1024;
}

async function lastChunk(
    file: string, decoder: NodeStringDecoder, offset: number | undefined, configSvc: ConfigService
): Promise<string> {

    const chunkSize = getChunkSize(configSvc);
    if (!TheBuffer
        // buffer created for a different chunkSize
        || TheBuffer.length !== 2 * chunkSize) {

        TheBuffer = Buffer.alloc(2 * chunkSize);
    }

    if (!offset || offset < 0) {
        offset = 0;
    }
    const fd = await fse.open(file, "r");
    try {
        const stat = await fse.stat(file);
        const partSize = stat.size - offset;
        if (partSize <= 0) {
            return "";
        }
        let res: fse.ReadResult;
        if (partSize > chunkSize) {
            const lastChunkSize = partSize % chunkSize;
            const readSize = chunkSize + lastChunkSize;
            res = await fse.read(fd, TheBuffer, 0, readSize, stat.size - readSize);
        } else {
            res = await fse.read(fd, TheBuffer, 0, partSize, offset);
        }
        const buff = res.buffer.slice(0, res.bytesRead);
        const text = decoder.write(buff);
        return text;
    } finally {
        await fse.close(fd);
    }
}

const _decoders: { [encoding: string]: NodeStringDecoder | undefined } = {};
function getDecoder(encoding: string): NodeStringDecoder {
    if(encoding == 'gb2312'){
        return new IConvDecoder(encoding)
    }
    
    let decoder = _decoders[encoding];
    if (decoder) {
        // clear internal buffer
        decoder.end();
        return decoder;
    }
    try {
        decoder = new StringDecoder(encoding);
        _decoders[encoding] = decoder;
        return decoder;
    } catch (error) {
        getInstace("logger").error(error);
        return getDecoder("utf8");
    }
}

interface WatchStateInternal {
    readonly watcher: IGlobWatcher;
    readonly decoder: NodeStringDecoder;
    lastFileName: string | undefined;
    offset: number | undefined;
    text: string | undefined;
    lastChangedOn: Date;
}

export interface WatchState {
    readonly uri: vscode.Uri;
    readonly lastFileName: string | undefined;
    readonly text: string | undefined;
    readonly lastChangedOn: Date;
}

export class LogProvider implements vscode.TextDocumentContentProvider, vscode.Disposable {

    private readonly _onContentProviderDidChange = new vscode.EventEmitter<vscode.Uri>();
    private readonly _onChange = new vscode.EventEmitter<WatchState>();
    private readonly _watchedUris: Map<string, WatchStateInternal> = new Map();

    constructor(private readonly configSvc: ConfigService) {
    }

    public has(uri: vscode.Uri): boolean {
        return this._watchedUris.has(uri.toString());
    }

    public get(uri: vscode.Uri): WatchState | undefined {
        const uriStr = uri.toString();
        const state = this._watchedUris.get(uriStr);
        if (!state) {
            return;
        }
        return {
            uri: uri,
            lastChangedOn: state.lastChangedOn,
            lastFileName: state.lastFileName,
            text: state.text,
        };
    }

    public async clearContents(uri: vscode.Uri): Promise<void> {
        const state = this._watchedUris.get(uri.toString());
        if (state && state.lastFileName) {
            const stat = await fse.stat(state.lastFileName);
            state.offset = stat.size;
            await this.checkChange(uri, state, state.lastFileName);
        }
    }

    public async restoreContents(uri: vscode.Uri): Promise<void> {
        const state = this._watchedUris.get(uri.toString());
        if (state && state.lastFileName) {
            state.offset = undefined;
            await this.checkChange(uri, state, state.lastFileName);
        }
    }

    public reload(uri: vscode.Uri): void {
        this._onContentProviderDidChange.fire(uri);
    }

    private async watchUri(uri: vscode.Uri): Promise<WatchStateInternal> {
        const uriStr = uri.toString();
        const foundState = this._watchedUris.get(uriStr);
        if (foundState) {
            return foundState;
        }
        const w = fromLogUri(uri);
        const options = this.configSvc.getEffectiveWatchOptions(w.id);
        const newState: WatchStateInternal = {
            watcher: new GlobWatcher(options, w),
            decoder: getDecoder(options.encoding),
            lastChangedOn: new Date(),
            lastFileName: undefined,
            offset: undefined,
            text: undefined,
        };
        newState.watcher.onChange(e => {
            this.checkChange(uri, newState, e.filename);
        });
        this._watchedUris.set(uriStr, newState);

        await newState.watcher.startWatch();
        // without this provideTextDocumentContent doesn't get text the first time
        await this.checkChange(uri, newState, newState.watcher.LastFile());

        return newState;
    }

    private async checkChange(uri: vscode.Uri, state: WatchStateInternal, filename: string | undefined): Promise<void> {
        // check if filename changed
        let didChange = false;
        if (state.lastFileName !== filename) {
            state.lastFileName = filename;
            state.offset = undefined;
            didChange = true;
        }

        // check if content changed
        let text: string | undefined;
        if (filename) {
            text = await lastChunk(filename, state.decoder, state.offset, this.configSvc);
        } else {
            text = undefined;
        }

        if (state.text !== text) {
            state.text = text;
            state.lastChangedOn = new Date();
            didChange = true;
        }

        // should this also fire only if content changed?
        this._onContentProviderDidChange.fire(uri);

        if (didChange) {
            this._onChange.fire({
                uri: uri,
                lastChangedOn: state.lastChangedOn,
                lastFileName: state.lastFileName,
                text: state.text,
            });
        }
    }

    get onDidChange(): vscode.Event<vscode.Uri> {
        return this._onContentProviderDidChange.event;
    }

    get onChange(): vscode.Event<WatchState> {
        return this._onChange.event;
    }

    public async provideTextDocumentContent(uri: vscode.Uri, token: vscode.CancellationToken): Promise<string> {
        const state = await this.watchUri(uri);
        if (typeof state.text !== "undefined") {
            return state.text || "\n"; // with empty string vscode keeps the previous text
        } else {
            return "no matching file found";
        }
    }

    public unWatch(uri: vscode.Uri): void {
        const uriStr = uri.toString();
        const state = this._watchedUris.get(uriStr);
        if (state) {
            state.watcher.dispose();
            this._watchedUris.delete(uriStr);
        }
    }

    public unWatchAll(): void {
        for (const state of this._watchedUris.values()) {
            state.watcher.dispose();
        }
        this._watchedUris.clear();
    }

    public dispose(): void {
        this.unWatchAll();
        this._onContentProviderDidChange.dispose();
    }
}

export function registerLogProvider(subs: vscode.Disposable[], configSvc: ConfigService): LogProvider {

    const logProvider = new LogProvider(configSvc);

    subs.push(logProvider);
    subs.push(
        vscode.workspace.registerTextDocumentContentProvider("log", logProvider)
    );

    subs.push(
        vscode.workspace.onDidCloseTextDocument(doc => {
            if (doc.uri.scheme === "log") {
                logProvider.unWatch(doc.uri);
            }
        })
    );

    return logProvider;
}