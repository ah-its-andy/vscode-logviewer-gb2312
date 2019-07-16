import { WorkspaceFolder, Event } from "./vscodeTypes";

export function assertNever(x: never): never {
    throw new Error(`${x} is not never`);
}

type Keys<T> = {
    [P in keyof T]: P
};

export function keys<T>(x: T): Keys<T> {
    const res: { [x: string]: string } = {};
    for (const k of Object.keys(x)) {
        res[k] = k;
    }
    return res as any as Keys<T>;
}

export async function delay(ms: number): Promise<void> {
    return new Promise<void>((res) => {
        setTimeout(res, ms);
    });
}

export class Deferred<T> {
    public readonly promise: Promise<T>;
    private _resolve!: (x: T) => void;
    private _reject!: (reason?: any) => void;

    public get resolve() {
        return this._resolve;
    }

    public get reject() {
        return this._reject;
    }

    constructor() {
        this.promise = new Promise((resolve, reject) => {
            this._reject = reject;
            this._resolve = resolve;
        });
    }
}

// may be usefull to avoid having to mock vscode
export function optRequire<T>(id: string): T | null {
    try {
        return require(id);
    } catch (error) {
        if (error.code === "MODULE_NOT_FOUND") {
            return null;
        } else {
            throw error;
        }
    }
}

export function getWorkspaceDir(
    // pass as parameter for easier testing
    workspaceFolders: WorkspaceFolder[] | undefined,
    workspaceName: string | undefined
): string | undefined {

    if (workspaceFolders && workspaceFolders.length) {
        let workspaceFolder = workspaceFolders[0];
        if (workspaceName) {
            const wf = workspaceFolders.find(x => x.name === workspaceName);
            if (wf) {
                workspaceFolder = wf;
            }
        }
        if (workspaceFolder) {
            return workspaceFolder.uri.fsPath;
        }
    }
}

export function mapEvent<T, R>(event: Event<T>, func: (x: T) => R): Event<R> {
    return (listener, thisArgs, disposables) => {
        return event(x => listener(func(x)), thisArgs, disposables);
    };
}

let _devEnv = false;
export function setDevEnv(val: boolean) {
    _devEnv = val;
}

export function isDevEnv() {
    return _devEnv;
}
