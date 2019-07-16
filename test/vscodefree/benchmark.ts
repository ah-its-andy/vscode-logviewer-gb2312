// tslint:disable:no-console
import "../requireMock";
import * as path from "path";
import { lsPattern, lsRec } from "../../src/common/fsUtil";
import { toPathMatcher } from "../../src/common/mmUtil";
import { rgInfos } from "../../src/common/rgUtil";
import { performance } from "perf_hooks";
import * as picomatch from "picomatch";
import * as os from "os";

async function bench(fn: (() => Promise<void>)) {
    const nWarm = 3;
    for (let i = 0; i < nWarm; i++) {
        await fn();
    }
    const n = 5;
    const t0 = performance.now();
    for (let i = 0; i < n; i++) {
        await fn();
    }
    const t1 = performance.now();
    console.log(`${(t1 - t0) / n} ms/op`);
}

async function main() {
    const yarnCache = `${os.homedir()}/.cache/yarn/v4`;
    // const pattern = path.join(nodeModulesDir, "!(@types)", "**", "*.d.ts");
    const pattern = "*/*/*/dist/**/*.map";
    const pg = toPathMatcher(pattern, { cwd: yarnCache });

    const res: string[] = [];

    console.log("lsRec + matcher");
    const mcher = picomatch(path.join(yarnCache, pattern));
    await bench(async () => {
        res.splice(0);
        await lsRec(yarnCache, f => {
            if (mcher(f.fullPath)) {
                res.push(f.fullPath);
            }
        }, console.error);
    });
    console.log(res.length);

    console.log("rg");
    await bench(async () => {
        res.splice(0);
        await rgInfos("rg",
            {
                basePath: yarnCache,
                pattern: pattern,
            },
            {
                onFile: f => res.push(f.fullPath),
                onError: console.error,
            }
        );
    });
    console.log(res.length);

    console.log("lsPattern");
    await bench(async () => {
        res.splice(0);
        await lsPattern(pg, f => {
            res.push(f.fullPath);
        }, console.error);
    });
    console.log(res.length);

}
main();