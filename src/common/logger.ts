import { performance } from "perf_hooks";
import { isDevEnv } from "./util";

export abstract class Logger {
    private readonly _times: { [label: string]: number } = {};
    protected abstract log(level: string, x: any): void;
    public error(x: any): void {
        this.log("[ERROR]", x);
    }

    public debug(x: any): void {
        if (isDevEnv()) {
            this.log("[DEBUG]", x);
        }
    }

    public timeStart(label: string) {
        this._times[label] = performance.now();
    }
    public timeEnd(label: string) {
        const t0 = this._times[label];
        if (t0) {
            const t1 = performance.now();
            delete this._times[label];
            const ms = (t1 - t0).toFixed(2);
            this.debug(`${label} ${ms} ms`);
        }
    }
}