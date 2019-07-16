import * as assert from "assert";
import { getWorkspaceDir } from "../../src/common/util";
import { testsInit } from "./testUtil";
import { WorkspaceFolder } from "../../src/common/vscodeTypes";

testsInit();

suite("vscodeUtil", () => {

    const workspaceFoldersMock: WorkspaceFolder[] = [
        {
            index: 0,
            name: "main",
            uri: {
                fsPath: "/home/berni/main"
            } as any
        },
        {
            index: 1,
            name: "alt",
            uri: {
                fsPath: "/home/berni/alt"
            } as any
        }
    ];

    interface TestCase {
        workspaceName: string | undefined;
        expectedWorkspaceDir: string;
    }

    test("getWorkspaceDir with workspaces", () => {
        const testCases: TestCase[] = [
            {
                workspaceName: "unkown",
                expectedWorkspaceDir: "/home/berni/main"
            },
            {
                workspaceName: undefined,
                expectedWorkspaceDir: "/home/berni/main"
            },
            {
                workspaceName: "main",
                expectedWorkspaceDir: "/home/berni/main"
            },
            {
                workspaceName: "alt",
                expectedWorkspaceDir: "/home/berni/alt"
            }
        ];

        for (const testCase of testCases) {
            const actualWorkspaceDir = getWorkspaceDir(workspaceFoldersMock, testCase.workspaceName);
            assert.equal(actualWorkspaceDir, testCase.expectedWorkspaceDir);
        }
    });

    test("getWorkspaceDir without workspaces", () => {
        assert.equal(getWorkspaceDir(undefined, "main"), undefined);
    });
});