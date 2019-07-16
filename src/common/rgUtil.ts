import { spawn } from "child_process";
import * as path from "path";
import * as fs from "fs";
import { FsWalkerOptions, FsWalkerSubscription } from "./fsWalker";
import { isDevEnv } from "./util";
import { getInstace } from "./container";

export function rg(
    rgPath: string, opts: FsWalkerOptions,
    onLine: (line: string) => void,
    onError: (err: Error) => void
): Promise<void> {
    return new Promise<void>((res, rej) => {
        const args: string[] = [
            "--files",
            "--no-ignore",
            "--hidden", // this doesn't seem to work
        ];
        // TODO check if making this optional works
        if (opts.pattern) {
            args.push("--glob");
            args.push(opts.pattern);
        }
        if (opts.ignorePattern) {
            args.push("--glob");
            args.push("!" + opts.ignorePattern);
        }
        const proc = spawn(rgPath, args, { cwd: opts.basePath });
        proc.on("error", e => {
            onError(e);
        });
        proc.stdout.on("data", (x) => {
            const lines = x.toString().split(/\r?\n/);
            for (const line of lines) {
                if (line) {
                    onLine(line);
                }
            }
        });
        proc.stderr.on("data", (x) => {
            // ignore??
            if (isDevEnv()) {
                const errMsg = x.toString().trim();
                getInstace("logger").error(errMsg);
            }
        });
        proc.on("exit", () => {
            res();
        });
    });
}

export function rgInfos(rgPath: string, opts: FsWalkerOptions, sub: FsWalkerSubscription): Promise<void> {
    return new Promise<void>((res) => {
        let pending = 1;
        function checkResolve() {
            if (pending === 0) {
                res();
            }
        }
        rg(rgPath, opts,
            (line) => {
                const fullPath = path.join(opts.basePath, line);
                pending += 1;
                fs.stat(fullPath, (err, stat) => {
                    pending -= 1;
                    if (err) {
                        sub.onError(err);
                    } else {
                        sub.onFile({
                            fullPath: fullPath,
                            stats: stat
                        });
                    }
                    checkResolve();
                });
            },
            sub.onError
        ).then(() => {
            pending -= 1;
            checkResolve();
        }).catch(err => {
            pending -= 1;
            sub.onError(err);
            checkResolve();
        });
    });
}