import Module = require("module");

const originalRequire = Module.prototype.require;
Module.prototype.require = function (...args) {
    const name = args[0];
    if (name === "vscode") {
        if (_withVscode) {
            const orig = originalRequire.apply(this, args);
            return getOrAddProxy(name, orig);
        } else {
            const mock = getOrAddMock(name);
            return mock;
        }
    } else if (name === "path") {
        const orig = originalRequire.apply(this, args);
        return getOrAddProxy(name, orig);
    } else {
        return originalRequire.apply(this, args);
    }
};

let _withVscode = false;
export function withVscode() {
    _withVscode = true;
}

const _proxies: { [name: string]: object } = {};
function getOrAddProxy(name: string, orig: object): object {
    let p = _proxies[name];
    if (!p) {
        const ph: ProxyHandler<object> = {
            get(target, prop) {
                const mock = _mocks[name];
                if (mock && (mock as any)[prop]) {
                    return (mock as any)[prop];
                } else {
                    return (target as any)[prop];
                }
            },
            apply() {

            }
        };
        p = new Proxy(orig, ph);
        _proxies[name] = p;
    }
    return p;
}

const _mocks: { [name: string]: object } = {};
function getOrAddMock(name: string): object {
    let mock = _mocks[name];
    if (typeof mock !== "object") {
        mock = {};
        _mocks[name] = mock;
    }
    return mock;
}
export function setMock(moduleName: string, mock: object): void {
    const curMock = getOrAddMock(moduleName);
    Object.assign(curMock, mock);
}

export function clearMocks() {
    for (const name of Object.keys(_mocks)) {
        const mock = _mocks[name];
        if (typeof mock === "object") {
            for (const key of Object.keys(mock)) {
                delete (mock as any)[key];
            }
        }
    }
}