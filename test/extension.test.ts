import * as assert from "assert";
import * as logUri from "../src/vscode/logUri";
import { checkRgPath } from "../src/vscode/rgUtil";
import * as path from "path";
import { FsWalkerFun, getNodeModulesDir, myWalkerFun } from "./vscodefree/testUtil";
import { rgWalkerFun } from "./testUtil";

suite("logUri", () => {

    test(`should not fail`, () => {

        const titleTestCases = [
            "/foo/bar",
            "α😀😂😉ω",
            "C:\\ñ.loga"
        ];
        const patternTestCases = [
            "/foo/bar/**/*.log",
            "C:\\user\\s & s*.log"
        ];

        for (const title of titleTestCases) {
            for (const pattern of patternTestCases) {
                const expected: logUri.WatchForUri = {
                    id: Math.round(Math.random() * 1000),
                    pattern: pattern,
                    title: title,
                    workspaceName: `w${title}${pattern}`,
                };
                const uri = logUri.toLogUri(expected);
                const actual = logUri.fromLogUri(uri);

                assert.deepStrictEqual(actual, expected);
            }
        }
    });

    test(`picks right extension`, () => {

        const testCases: Array<{ input: string, expected: string }> = [
            { input: "/foo/bar/**/*.log", expected: ".log" },
            { input: "/foo/bar{1,3}/**/*.log*", expected: ".log-viewer-gb2312" },
            { input: "/foo/bar/**/*asd*txt", expected: ".log-viewer-gb2312" },
            { input: "/foo/bar/**/*asd*txt.", expected: ".log-viewer-gb2312" },
            { input: "/foo/(bar|baz)/**/*asd*.txt", expected: ".txt" },
            { input: "/foo/bar/**/*a[a]sd*.xml", expected: ".xml" },
        ];

        function verifyExtension(wc: logUri.WatchForUri, expectedExtension: string) {
            const uri = logUri.toLogUri(wc);
            assert(uri.path.endsWith(expectedExtension),
                `Pattern: ${wc.pattern}, "${uri.toString()}" didn't end with "${expectedExtension}"`);
        }

        for (const tc of testCases) {
            verifyExtension({
                id: 134,
                pattern: tc.input,
                workspaceName: undefined,
            }, tc.expected);
            verifyExtension({
                id: 556,
                pattern: tc.input,
                title: "some title",
                workspaceName: undefined,
            }, tc.expected);
        }
    });
});

suite("FsWalker", () => {

    async function compareWalkers(actualFun: FsWalkerFun, expectedFun: FsWalkerFun) {
        const patterns = [
            "**/*.d.ts",
            // this doesn't work in rg, is it a bug?
            // cli: rg /home/berni/Documentos/src/log-viewer-gb2312/node_modules --no-ignore --hidden --files --glob '*/*.json'
            "*/*.json",
            "**/*.xlsx",
        ];

        async function collect(pattern: string, f: FsWalkerFun): Promise<string[]> {
            const walker = f(pattern);
            const acc: string[] = [];
            await walker.walk({
                onError: (err) => assert.fail(err.toString()),
                onFile: (fi) => acc.push(fi.fullPath),
            });
            return acc;
        }

        const nodeModulesDir = getNodeModulesDir();

        for (const relPattern of patterns) {
            const fullPattern = path.join(nodeModulesDir, relPattern);
            const actual = await collect(fullPattern, actualFun);
            const expected = await collect(fullPattern, expectedFun);
            assert.deepStrictEqual(expected.sort(), actual.sort());
        }
    }

    test("compare MyWalter and RgWalker", async () => {
        await checkRgPath();
        await compareWalkers(myWalkerFun, rgWalkerFun);
    });

});