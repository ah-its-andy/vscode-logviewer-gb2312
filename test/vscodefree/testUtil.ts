import { FsWalker } from "../../src/common/fsWalker";
import { toPathMatcher } from "../../src/common/mmUtil";
import { MyWalker } from "../../src/common/fsUtil";
import * as path from "path";
import { ConfigTypeMap } from "../../src/common/config";
import { setMock } from "../requireMock";
import { registerInstance } from "../../src/common/container";

export type FsWalkerFun = (pattern: string) => FsWalker;

export const myWalkerFun: FsWalkerFun = (pattern) => {
    const pm = toPathMatcher(pattern);
    return new MyWalker(pm);
};

export function getNodeModulesDir() {
    return path.resolve(__dirname, "..", "..", "..", "node_modules");
}

let _config: Partial<ConfigTypeMap> = {};

export function testsInit() {
    registerInstance("config", {
        get(k: keyof ConfigTypeMap) {
            // HACK compiler bug maybe?
            return _config[k] as any;
        },
        getEffectiveWatchOptions(id: number) {
            throw new Error("Not implemented");
        },
        getWatches() {
            return [];
        }
    });
}

export function testSetConfiguration(config: Partial<ConfigTypeMap>) {
    _config = config;
}

export function testSetPathSep(sep: typeof path.sep) {
    setMock("path", {
        get sep() {
            return sep;
        }
    });
}