import { RgWalker } from "../src/vscode/rgUtil";
import { FsWalkerFun } from "./vscodefree/testUtil";
import { parsePattern } from "../src/common/pathPattern";

export const rgWalkerFun: FsWalkerFun = (pattern) => {
    const pat = parsePattern(pattern);
    return new RgWalker({
        basePath: pat.basePath,
        pattern: pat.pattern,
    });
};