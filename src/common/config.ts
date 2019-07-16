export interface WatchGroup {
    kind: "group";
    readonly groupName: string;
    readonly watches: ReadonlyArray<WatchEntry>;
}

export interface Watch {
    kind: "watch";
    readonly id: number;
    readonly title: string | undefined;
    readonly pattern: string;
    readonly workspaceName: string | undefined;
    readonly options: Partial<WatchOptions> | undefined;
}

export type WatchEntry = WatchGroup | Watch;

export interface WatchOptions {
    readonly fileCheckInterval: number;
    readonly fileListInterval: number;
    readonly ignorePattern: string;
    readonly encoding: string;
}

export interface ConfigTypeMap {
    "options": Partial<WatchOptions>;
    "useRipgrep": boolean;
    "ripgrepPath": string;
    "windows": WindowsConfig;
    "showStatusBarItemOnChange": boolean;
    "chunkSizeKb": number;
}

interface WindowsConfig {
    "allowBackslashAsPathSeparator": boolean;
}

export interface IConfigService {
    get<K extends keyof ConfigTypeMap>(key: K): ConfigTypeMap[K] | undefined;
    getWatches(): WatchEntry[];
    getEffectiveWatchOptions(watchId: number): WatchOptions;
}

export const DefaulOptions: Readonly<WatchOptions> = Object.freeze({
    fileCheckInterval: 500,
    fileListInterval: 2000,
    ignorePattern: "(node_modules|.git)",
    encoding: "utf8",
});