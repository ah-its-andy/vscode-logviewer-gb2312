import * as vscode from "vscode";
import * as path from "path";
import * as fse from "../common/fsExtra";
import { getInstace } from "../common/container";
import { lsRec } from "../common/fsUtil";
import { FsWalker, FsWalkerSubscription, FsWalkerOptions } from "../common/fsWalker";
import { rgInfos } from "../common/rgUtil";

let _rgPath: string | undefined;
export async function checkRgPath(): Promise<boolean> {
    const rgPaths = [
        "node_modules.asar.unpacked/vscode-ripgrep/bin/rg",
        "extensions/search-rg/node_modules/vscode-ripgrep/bin/rg"
    ];

    const configRgPath = getInstace("config").get("ripgrepPath");
    if (configRgPath) {
        rgPaths.push(configRgPath);
    }

    for (const rgRelPath of rgPaths) {
        const rgPath = path.join(vscode.env.appRoot, rgRelPath);
        const exists = await fse.exists(rgPath);
        if (exists) {
            _rgPath = rgPath;
            return true;
        }
    }

    // fallback
    let res = false;
    await lsRec(vscode.env.appRoot,
        f => {
            const name = path.basename(f.fullPath);
            if (name === "rg" || name === "rg.exe") {
                _rgPath = f.fullPath;
                res = true;
            }
        });
    return res;
}

export function rgPathFound(): boolean {
    return typeof _rgPath === "string";
}

export class RgWalker implements FsWalker {
    public readonly rgPath: string;
    constructor(private readonly opts: FsWalkerOptions) {
        if (!_rgPath) {
            throw new Error("Couldn't find rg");
        } else {
            this.rgPath = _rgPath;
        }
        const options = this.opts as any;
        options.pattern = options.pattern;
    }
    public walk(sub: FsWalkerSubscription)
        : Promise<void> {
        return rgInfos(this.rgPath, this.opts, sub);
    }
}