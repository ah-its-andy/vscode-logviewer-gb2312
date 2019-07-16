import { FileInfo } from "./fsUtil";

export interface FsWalkerOptions {
    readonly basePath: string;
    readonly pattern: string | null;
    readonly ignorePattern?: string;
}

export interface FsWalkerSubscription {
    onFile: (fi: FileInfo) => void;
    onError: (err: NodeJS.ErrnoException) => void;
}

export interface FsWalker {
    walk(sub: FsWalkerSubscription): Promise<void>;
}