import * as fs from "fs";
import { join } from "path";
import { PathMatcher, myIsMatch } from "./mmUtil";
import { FsWalker, FsWalkerSubscription } from "./fsWalker";
import { BeforeGlobstarParts } from "./pathPattern";

export interface FileInfo {
    readonly fullPath: string;
    readonly stats: fs.Stats;
}
export function lsRec(
    dirpath: string,
    onFile: (fi: FileInfo) => void,
    onError?: (err: NodeJS.ErrnoException) => void,
): Promise<void> {
    const onErr = onError || (() => { });
    return new Promise<void>((resolve) => {

        let pending = 1;

        function decPending(): void {
            pending--;
            if (pending === 0) {
                resolve();
            }
        }

        const onStats = (path: string) => (err: NodeJS.ErrnoException | null, stats: fs.Stats) => {
            if (err) {
                onErr(err);
                decPending();
            } else if (stats.isDirectory()) {
                fs.readdir(path, onReaddir(path));
            } else {
                onFile({
                    fullPath: path,
                    stats: stats,
                });
                decPending();
            }
        };

        const onReaddir = (path: string) => (err: NodeJS.ErrnoException | null, names: string[]) => {
            if (err) {
                onErr(err);
            } else {
                pending += names.length;
                for (const name of names) {
                    step(join(path, name));
                }
            }

            decPending();
        };

        function step(path: string) {
            fs.stat(path, onStats(path));
        }

        step(dirpath);
    });
}

export function lsPattern(
    pathMatcher: PathMatcher,
    onFile: (fi: FileInfo) => void,
    onError?: (err: NodeJS.ErrnoException) => void)
    : Promise<void> {

    const onErr = onError || (() => { });

    return new Promise<void>((resolve) => {

        let pending = 1;

        function decPending(): void {
            pending--;
            if (pending === 0) {
                resolve();
            }
        }

        const onStats = (path: string, patternParts: BeforeGlobstarParts | undefined) =>
            (err: NodeJS.ErrnoException | null, stats: fs.Stats) => {
                if (err) {
                    onErr(err);
                    decPending();
                    return;
                }

                if (stats.isDirectory()) {
                    if (patternParts || pathMatcher.hasGlobstar) {
                        fs.readdir(path, onReaddir(path, patternParts));
                    } else {
                        decPending();
                    }
                } else {
                    if (!patternParts && pathMatcher.fullPathMatcher(path)) {
                        onFile({
                            fullPath: path,
                            stats: stats,
                        });
                    }
                    decPending();
                }
            };

        const onReaddir = (path: string, patternParts: BeforeGlobstarParts | undefined) =>
            (err: NodeJS.ErrnoException | null, names: string[]) => {
                if (err) {
                    onErr(err);
                } else {
                    const restParts = patternParts && patternParts.tail;
                    for (const name of names) {
                        if (pathMatcher.nameIgnoreMatcher(name)) {
                            continue;
                        } else if (patternParts && !myIsMatch(name, patternParts.head)) {
                            continue;
                        }

                        pending += 1;
                        const subPath = join(path, name);
                        step(subPath, restParts);
                    }
                }
                decPending();
            };

        function step(path: string, patternParts: BeforeGlobstarParts | undefined) {
            fs.stat(path, onStats(path, patternParts));
        }

        step(pathMatcher.basePath, pathMatcher.patterns);
    });
}

export class MyWalker implements FsWalker {
    constructor(private readonly pathMatcher: PathMatcher) {
    }
    public walk(sub: FsWalkerSubscription): Promise<void> {
        return lsPattern(this.pathMatcher, sub.onFile, sub.onError);
    }
}