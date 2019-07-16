import * as vscode from "vscode";
import * as fse from "../common/fsExtra";
import * as path from "path";
import { FileInfo, MyWalker } from "../common/fsUtil";
import { toPathMatcher } from "../common/mmUtil";
import { WatchForUri } from "./logUri";
import { FsWalker } from "../common/fsWalker";
import { RgWalker, rgPathFound } from "./rgUtil";
import { WatchOptions } from "../common/config";
import { getWorkspaceDir } from "../common/util";
import { getInstace } from "../common/container";
import { parsePattern } from "../common/pathPattern";
import { Logger } from "../common/logger";
import { isDevEnv } from "../common/util";

export interface GlobChange {
    readonly filename: string | undefined;
}

export type IGlobWatcherConstructor = new (options: WatchOptions, watch: WatchForUri) => IGlobWatcher;

export interface IGlobWatcher extends vscode.Disposable {
    readonly onChange: vscode.Event<GlobChange>;
    LastFile(): string | undefined;
    startWatch(): Promise<void>;
}

function getWalker(watch: WatchForUri, ignorePattern: string | undefined): FsWalker {
    const cwd = getWorkspaceDir(vscode.workspace.workspaceFolders, watch.workspaceName);
    const useRg = getInstace("config").get("useRipgrep");
    if (useRg && rgPathFound()) {
        const pat = parsePattern(watch.pattern);
        let basePath = pat.basePath;
        if (cwd && !path.isAbsolute(basePath)) {
            basePath = path.join(cwd, basePath);
        }
        return new RgWalker({
            basePath: basePath,
            pattern: pat.pattern,
            ignorePattern: ignorePattern
        });
    } else {
        const pathMatcher = toPathMatcher(watch.pattern, {
            cwd: cwd,
            nameIgnorePattern: ignorePattern,
        });
        return new MyWalker(pathMatcher);
    }
}

class SimpleGlobWatcher implements IGlobWatcher {

    private readonly logger: Logger;
    private readonly walker: FsWalker;

    private fileTimer: NodeJS.Timer | undefined;
    private globTimer: NodeJS.Timer | undefined;

    private readonly _onChange = new vscode.EventEmitter<GlobChange>();

    private lastFile: FileInfo | undefined;

    public get onChange(): vscode.Event<GlobChange> {
        return this._onChange.event;
    }

    public LastFile() {
        if (this.lastFile) {
            return this.lastFile.fullPath;
        }
    }

    constructor(
        private readonly options: WatchOptions,
        readonly watch: WatchForUri,
    ) {
        this.logger = getInstace("logger");
        this.walker = getWalker(watch, this.options.ignorePattern);
    }

    public async startWatch() {
        this.fileTick();
        await this.globTick();
    }

    private fileTick = async () => {
        if (this.lastFile) {
            try {
                const newStat = await fse.stat(this.lastFile.fullPath);
                if (newStat.mtime.getTime() !== this.lastFile.stats.mtime.getTime()
                    || newStat.size !== this.lastFile.stats.size) {
                    this._onChange.fire({
                        filename: this.lastFile.fullPath,
                    });
                }
            } catch (err) {
                this.logger.error(err);
                this.lastFile = undefined;
                this._onChange.fire({
                    filename: undefined,
                });
            }
        }

        this.fileTimer = setTimeout(this.fileTick, this.options.fileCheckInterval);
    }

    private onError = (err: Error) => {
        if (isDevEnv()) {
            this.logger.error(err);
        }
    }

    private globTick = async () => {

        let maxMTime = 0;
        let maxFI: FileInfo | undefined;

        if (isDevEnv()) {
            this.logger.timeStart(this.watch.pattern);
        }

        await this.walker.walk({
            onFile: (fi) => {
                const mt = fi.stats.mtime.getTime();
                if (mt > maxMTime) {
                    maxMTime = mt;
                    maxFI = fi;
                }
            },
            onError: this.onError
        });

        if (isDevEnv()) {
            this.logger.timeEnd(this.watch.pattern);
        }

        if (maxFI) {
            let newLastFile = false;
            if (this.lastFile) {
                if (maxFI.fullPath !== this.lastFile.fullPath) {
                    newLastFile = true;
                }
            } else {
                newLastFile = true;
            }
            if (newLastFile) {
                this.lastFile = maxFI;
                this._onChange.fire({
                    filename: maxFI.fullPath,
                });
            }
        } else {
            if (this.lastFile) {
                this.lastFile = undefined;
                this._onChange.fire({
                    filename: undefined,
                });
            }
        }

        this.globTimer = setTimeout(this.globTick, this.options.fileListInterval);
    }

    public dispose() {
        if (this.fileTimer) {
            clearTimeout(this.fileTimer);
        }
        if (this.globTimer) {
            clearTimeout(this.globTimer);
        }
    }
}

export const SimpleGlobWatcherConstructable: IGlobWatcherConstructor = SimpleGlobWatcher;