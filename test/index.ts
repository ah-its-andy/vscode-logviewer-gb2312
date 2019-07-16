import * as path from "path";
import * as Mocha from "mocha";
import * as fg from "fast-glob";
import { withVscode } from "./requireMock";
withVscode();

export async function run(): Promise<void> {
    // Create the mocha test
    const mocha = new Mocha({
        ui: "tdd",
        useColors: true,
        // grep: "parsePattern"
    });
    mocha.useColors(true);

    const testsRoot = path.resolve(__dirname);

    const files = await fg("**/**.test.js", { cwd: testsRoot });
    for (const file of files) {
        mocha.addFile(path.resolve(testsRoot, file));
    }

    return new Promise((res, rej) => {
        mocha.run(failures => {
            if (failures > 0) {
                rej(new Error(`${failures} tests failed.`));
            } else {
                res();
            }
        });
    });
}