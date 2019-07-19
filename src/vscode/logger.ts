import { Logger } from "../common/logger";
import * as vscode from "vscode";

function toStr(x: any): string {
    if (typeof x === "string") {
        return x;
    } else if (typeof x.toString === "function") {
        return x.toString();
    } else {
        return JSON.stringify(x, undefined, "\t");
    }
}

export class OutputChannelLogger extends Logger implements vscode.Disposable {
    private _outputChannel: vscode.OutputChannel | undefined;
    protected log(level: string, x: any): void {
        if (!this._outputChannel) {
            this._outputChannel = vscode.window.createOutputChannel("log-viewer-gb2312");
            this._outputChannel.show();
        }
        const str = level + " " + toStr(x);
        this._outputChannel.appendLine(str);
    }

    public dispose() {
        if (this._outputChannel) {
            this._outputChannel.dispose();
        }
    }
}