// HACK just for types
declare module "picomatch_types" {

    interface Ast {
        index: number;
        start: number;
        consumed: string;
        output: string;
        backtrack: boolean;
        brackets: number;
        braces: number;
        parens: number;
        quotes: number;
        tokens: AstToken[];
    }

    type AstTokenType =
        | "bos"
        | "brace"
        | "bracket"
        | "comma"
        | "dot"
        | "globstar"
        | "maybe_slash"
        | "negate"
        | "paren"
        | "plus"
        | "slash"
        | "star"
        | "text";

    interface AstToken {
        type: AstTokenType;
        value: string;
        output: string;
        prev?: AstToken;
    }

    interface Options {
        fastpaths?: boolean;
        dot?: boolean;
        unixify?: boolean;
    }
}


declare module "picomatch" {
    import { Options, Ast } from "picomatch_types";
    interface Picomatch {
        parse(glob: string, options?: Options): Ast;
        isMatch(str: string | string[], pattern: string | string[], options?: Options): boolean;
        (glob: string | string[], options?: Options): (str: string) => boolean;
    }
    const picomatch: Picomatch;
    export = picomatch;
}