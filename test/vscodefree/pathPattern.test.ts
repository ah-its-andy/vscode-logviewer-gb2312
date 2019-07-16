import * as assert from "assert";
import { parsePattern, toFullPathPattern } from "../../src/common/pathPattern";
import { clearMocks } from "../requireMock";
import { testSetConfiguration, testSetPathSep, testsInit } from "./testUtil";

testsInit();

suite("parsePattern windows", () => {

    suiteSetup(() => {
        testSetConfiguration({ windows: { allowBackslashAsPathSeparator: false } });
        testSetPathSep("\\");
    });

    suiteTeardown(() => {
        clearMocks();
    });

    test("escape characters", () => {

        const parsed = parsePattern("C:/Program Files \\(x86\\)/MyApp/(server|client)/*.log");
        const expected = {
            basePath: "C:\\Program Files (x86)\\MyApp\\",
            beforGlobstarParts: {
                head: "(server|client)",
                tail: {
                    head: "*.log",
                    tail: undefined
                }
            },
            pattern: "(server|client)/*.log",
            hasGlobstar: false
        };
        assert.deepStrictEqual(parsed, expected);
    });

    test("backslash path sep", () => {
        testSetConfiguration({ windows: { allowBackslashAsPathSeparator: true } });
        testSetPathSep("\\");

        const parsed = parsePattern("\\\\server\\logs\\**\\*.log");
        const expected = {
            basePath: "\\\\server\\logs\\",
            beforGlobstarParts: undefined,
            pattern: "**/*.log",
            hasGlobstar: true
        };
        assert.deepStrictEqual(parsed, expected);
    });

    test("relative path forward slash", () => {
        testSetPathSep("\\");

        const parsed = toFullPathPattern("application/logs/**/.log", "E:\\repro");
        const expected = {
            // HACK because of incomplete windows mock
            basePath: "E:\\repro/application\\logs\\",
            beforGlobstarParts: undefined,
            fullPattern: "E:/repro/application/logs/**/.log",
            hasGlobstar: true
        };
        assert.deepStrictEqual(parsed, expected);
    });
});

suite("parsePattern", () => {

    suiteSetup(() => {
        testSetConfiguration({ windows: { allowBackslashAsPathSeparator: false } });
    });

    test("concrete full path", () => {
        const parsed = parsePattern("/home/berni/app/debug.log");
        const expected = {
            basePath: "/home/berni/app/debug.log",
            beforGlobstarParts: undefined,
            pattern: null,
            hasGlobstar: false
        };
        assert.deepStrictEqual(parsed, expected);
    });

    test("concrete full path 1 level", () => {
        const parsed = parsePattern("/debug.log");
        const expected = {
            basePath: "/debug.log",
            beforGlobstarParts: undefined,
            pattern: null,
            hasGlobstar: false
        };
        assert.deepStrictEqual(parsed, expected);
    });

    test("concrete relative path", () => {
        const parsed = parsePattern("app/debug.log");
        const expected = {
            basePath: "app/debug.log",
            beforGlobstarParts: undefined,
            pattern: null,
            hasGlobstar: false
        };
        assert.deepStrictEqual(parsed, expected);
    });

    test("concrete relative path 1 level", () => {
        const parsed = parsePattern("debug.log");
        const expected = {
            basePath: "debug.log",
            beforGlobstarParts: undefined,
            pattern: null,
            hasGlobstar: false
        };
        assert.deepStrictEqual(parsed, expected);
    });
});

suite("toFullPathPattern", () => {
    const samplePattern = "(bar|baz)/*.d/**/*asd*";

    const expectedPatternParts = {
        head: "(bar|baz)",
        tail: {
            head: "*.d",
            tail: undefined
        },
    };

    test("empty relative path", () => {
        const pathGlob = toFullPathPattern(samplePattern, "/home/berni/");
        assert.equal(pathGlob.basePath, "/home/berni/");
        assert.equal(pathGlob.fullPattern, "/home/berni/" + samplePattern);
        assert.deepStrictEqual(pathGlob.beforGlobstarParts, expectedPatternParts);
        assert(pathGlob.hasGlobstar);
    });

    test("simple relative path", () => {
        const pattern = "foo/" + samplePattern;
        const pathGlob = toFullPathPattern(pattern, "/home/berni");
        assert.equal(pathGlob.basePath, "/home/berni/foo/");
        assert.equal(pathGlob.fullPattern, "/home/berni/foo/" + samplePattern);
        assert.deepStrictEqual(pathGlob.beforGlobstarParts, expectedPatternParts);
        assert(pathGlob.hasGlobstar);
    });

    test("single dot relative path", () => {
        const pattern = "./foo/" + samplePattern;
        const pathGlob = toFullPathPattern(pattern, "/home/berni/");
        assert.equal(pathGlob.basePath, "/home/berni/foo/");
        assert.equal(pathGlob.fullPattern, "/home/berni/foo/" + samplePattern);
        assert.deepStrictEqual(pathGlob.beforGlobstarParts, expectedPatternParts);
        assert(pathGlob.hasGlobstar);
    });

    test("double dot relative path", () => {
        const pattern = "../foo/" + samplePattern;
        const pathGlob = toFullPathPattern(pattern, "/home/berni");
        assert.equal(pathGlob.basePath, "/home/foo/");
        assert.equal(pathGlob.fullPattern, "/home/foo/" + samplePattern);
        assert.deepStrictEqual(pathGlob.beforGlobstarParts, expectedPatternParts);
        assert(pathGlob.hasGlobstar);
    });

    function absolutePathPatternTest(basePath: string, expectedBasePath: string) {
        const pattern = basePath + samplePattern;
        {
            const pathGlobNoCwd = toFullPathPattern(pattern, undefined);
            assert.equal(pathGlobNoCwd.basePath, expectedBasePath);
            assert.equal(pathGlobNoCwd.fullPattern, expectedBasePath + samplePattern);
            assert.deepStrictEqual(pathGlobNoCwd.beforGlobstarParts, expectedPatternParts);
            assert(pathGlobNoCwd.hasGlobstar);
        }

        {
            const pathGlobCwd = toFullPathPattern(pattern, "/other/dir");
            assert.equal(pathGlobCwd.basePath, expectedBasePath);
            assert.equal(pathGlobCwd.fullPattern, expectedBasePath + samplePattern);
            assert.deepStrictEqual(pathGlobCwd.beforGlobstarParts, expectedPatternParts);
            assert(pathGlobCwd.hasGlobstar);
        }
    }

    test("absolute path", () => {
        absolutePathPatternTest("/home/berni/foo/", "/home/berni/foo/");
    });

    test("absolute path, base path is root", () => {
        absolutePathPatternTest("/", "/");
    });

    test("path to file", () => {
        const pattern = ".gitignore";
        const pathGlob = toFullPathPattern(pattern, "/home/berni/foo/");
        const expectedPath = "/home/berni/foo/.gitignore";
        assert.equal(pathGlob.basePath, expectedPath);
        assert.equal(pathGlob.fullPattern, expectedPath);
        assert.equal(pathGlob.beforGlobstarParts, undefined);
        assert(!pathGlob.hasGlobstar);
    });

    test("$HOME", () => {
        process.env.HOME = "/home/test_home";
        absolutePathPatternTest("$HOME/foo/", "/home/test_home/foo/");
        absolutePathPatternTest("~/foo/", "/home/test_home/foo/");
    });

    test("not $HOME", () => {
        process.env.HOME = "/home/test_home";
        absolutePathPatternTest("/foo/~/bar/", "/foo/~/bar/");
        absolutePathPatternTest("/foo/$HOME/bar/", "/foo/$HOME/bar/");
    });
});