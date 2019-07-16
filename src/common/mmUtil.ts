import * as path from "path";
import * as picomatch from "picomatch";
import * as picomatch_types from "picomatch_types";
import {
    BeforeGlobstarParts, FixedPattern, fixPathSeparators,
    fixPatternPathSeparators, toFullPathPattern
} from "./pathPattern";

export interface PathMatcher {
    readonly basePath: string;
    readonly patterns: BeforeGlobstarParts | undefined;
    readonly hasGlobstar: boolean;
    readonly nameIgnoreMatcher: (name: string) => boolean;
    readonly fullPathMatcher: (path: string) => boolean;
}

export interface PathMatcherOptions {
    cwd?: string;
    nameIgnorePattern?: string;
}

const myMmOptions: picomatch_types.Options = {
    dot: true,
    unixify: false,
};

export function myIsMatch(somePath: string, pattern: FixedPattern): boolean {
    somePath = fixPathSeparators(somePath);
    return picomatch.isMatch(somePath, pattern, myMmOptions);
}

export function myMatcher(pattern: FixedPattern): (str: string) => boolean {
    const matcher = picomatch(pattern, myMmOptions);
    if (path.sep === "\\") {
        //micromatch doesn't work properly with "\" as directory separator
        //replace with "/" for matching
        return (str) => matcher(str.replace(/\\/g, "/"));
    } else {
        return matcher;
    }
}

export function toPathMatcher(pattern: string, options?: PathMatcherOptions): PathMatcher {
    const p = toFullPathPattern(pattern, options && options.cwd);

    const fullPathMatcher = myMatcher(p.fullPattern);
    let nameIgnoreMatcher: (name: string) => boolean;
    if (options && options.nameIgnorePattern) {
        const nameIgnorePattern = fixPatternPathSeparators(options.nameIgnorePattern);
        nameIgnoreMatcher = myMatcher(nameIgnorePattern);
    } else {
        nameIgnoreMatcher = (_) => false;
    }

    return {
        basePath: p.basePath,
        patterns: p.beforGlobstarParts,
        hasGlobstar: p.hasGlobstar,
        fullPathMatcher: fullPathMatcher,
        nameIgnoreMatcher: nameIgnoreMatcher
    };
}