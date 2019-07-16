import * as assert from "assert";
import * as path from "path";
import { delay } from "../../src/common/util";
import { lsRec } from "../../src/common/fsUtil";
import { myWalkerFun, getNodeModulesDir, testsInit } from "./testUtil";
import { FsWalkerSubscription } from "../../src/common/fsWalker";

testsInit();

async function assertTerminates<T>(promise: Promise<T>, timeout?: number, message?: string): Promise<T> {
    let completed = false;
    promise.then(() => completed = true);
    const res = await Promise.race([promise, delay(timeout || 10)]);
    assert(completed, message || "didn't complete in time");
    return res as T;
}

suite("lsPattern", () => {
    test("terminates on invalid path", async () => {
        const noOpSub: FsWalkerSubscription = {
            onFile: (fi) => {
                assert.fail(fi.fullPath);
            },
            onError: () => { }
        };
        await assertTerminates(myWalkerFun("/notexisting/path").walk(noOpSub));
    });

    test("node_modules/**/*.d.ts", async () => {
        const nodeModulesDir = getNodeModulesDir();

        // find expected files with lsRec
        const expectedFiles: string[] = [];

        const lsRecPromise = lsRec(nodeModulesDir,
            (fi) => {
                if (/\.d\.ts$/.test(fi.fullPath)) {
                    expectedFiles.push(fi.fullPath);
                }
            },
            (err) => {
                // assert.fail(err.toString());
            });

        // find files with lsPattern
        const pattern = path.join(nodeModulesDir, "**", "*.d.ts");

        const foundFiles: string[] = [];

        const lsPatternPromise = myWalkerFun(pattern).walk({
            onFile: (fi) => {
                foundFiles.push(fi.fullPath);
            },
            onError: (err) => {
                // assert.fail(err.toString()); TODO?
            }
        });

        await assertTerminates(lsPatternPromise, 1000, "lsPatternPromise < 1000ms");
        await assertTerminates(lsRecPromise, 1000, "lsRecPromise < 1000ms");

        assert(foundFiles.length);

        assert.deepStrictEqual(foundFiles.sort(), expectedFiles.sort());
    });
});

suite("lsRec", () => {
    test("terminates on invalid path", async () => {
        await assertTerminates(lsRec("/notexisting/path", () => { }));
    });
});