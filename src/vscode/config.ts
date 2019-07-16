import { WatchOptions, IConfigService, ConfigTypeMap, WatchEntry, Watch, DefaulOptions } from "../common/config";
import * as vscode from "vscode";

interface ConfigGroup {
    readonly groupName: string;
    readonly watches: ReadonlyArray<ConfigEntry>;
}

interface ConfigWatch {
    readonly title: string | undefined;
    readonly pattern: string;
    readonly workspaceName: string | undefined;
    readonly options: Partial<WatchOptions> | undefined;
}

type ConfigEntry = string | ConfigWatch | ConfigGroup;

/*
to add to package.json when ready

"logViewer.useRipgrep": {
    "type": "boolean",
    "default": false,
    "description": "Use ripgrep if available"
},
"logViewer.ripgrepPath": {
    "type": "string",
    "default": null,
    "description": "Path to ripgrep binary (if null the one bundled with vscode will be used)"
}
*/

interface InternalConfigTypeMap extends ConfigTypeMap {
    "watch": ConfigEntry[] | undefined;
}

export class ConfigService implements vscode.Disposable, IConfigService {

    private readonly _onChange = new vscode.EventEmitter<void>();
    private config!: vscode.WorkspaceConfiguration & InternalConfigTypeMap;
    private readonly watches: WatchEntry[] = [];
    private readonly watchesById = new Map<number, Watch>();
    private seqId = 0;

    constructor() {
        this.load();
        vscode.workspace.onDidChangeConfiguration(e => {
            this.load();
            this._onChange.fire();
        });
    }

    private nextId() {
        return this.seqId++;
    }

    private readonly toWatchEntry = (configEntry: ConfigEntry): WatchEntry => {
        if (typeof configEntry === "string") {
            const watch: Watch = {
                kind: "watch",
                id: this.nextId(),
                options: undefined,
                pattern: configEntry,
                title: configEntry,
                workspaceName: undefined,
            };
            this.watchesById.set(watch.id, watch);
            return watch;
        } else if ("groupName" in configEntry) {
            return {
                kind: "group",
                groupName: configEntry.groupName,
                watches: configEntry.watches.map(this.toWatchEntry),
            };
        } else {
            const watch: Watch = {
                kind: "watch",
                id: this.nextId(),
                ...configEntry
            };
            this.watchesById.set(watch.id, watch);
            return watch;
        }
    }

    get onChange(): vscode.Event<void> {
        return this._onChange.event;
    }

    private load() {
        this.watches.splice(0);
        this.watchesById.clear();
        this.seqId = 0;
        this.config = vscode.workspace.getConfiguration("logViewer") as any;
        const configWatches = this.config.watch;
        if (configWatches) {
            for (const w of configWatches) {
                this.watches.push(this.toWatchEntry(w));
            }
        }
    }

    public get<K extends keyof ConfigTypeMap>(key: K): ConfigTypeMap[K] | undefined {
        return this.config.get(key);
    }

    public getWatches(): WatchEntry[] {
        return this.watches;
    }

    public getEffectiveWatchOptions(watchId: number): WatchOptions {
        // copy
        const resultOpts = Object.assign({}, DefaulOptions);

        const globalOpts = this.config.options;

        if (globalOpts) {
            Object.assign(resultOpts, globalOpts);
        }

        const watch = this.watchesById.get(watchId);
        if (watch && watch.options) {
            Object.assign(resultOpts, watch.options);
        }

        return resultOpts;
    }

    public dispose() {
        this._onChange.dispose();
    }
}
