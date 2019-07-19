// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

// import * as logMock from "./logMock";
import { checkRgPath } from "./vscode/rgUtil";
import { setDevEnv, isDevEnv } from "./common/util";
import * as path from "path";
import { ConfigService } from "./vscode/config";
import { OutputChannelLogger } from "./vscode/logger";
import { registerLogProvider } from "./vscode/logProvider";
import { registerStatusBarItems } from "./vscode/statusBarItems";
import { registerLogExplorer as registerLogExplorer } from "./vscode/logExplorer";
import { registerInstance } from "./common/container";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    // HACK
    const extDirName = path.basename(context.extensionPath);
    if (extDirName === "log-viewer-gb2312" || extDirName === "vscode-log-viewer-gb2312") {
        setDevEnv(true);
    } else {
        setDevEnv(false);
    }

    const subs = context.subscriptions;

    const configSvc = new ConfigService();
    subs.push(configSvc);
    registerInstance("config", configSvc);

    const logger = new OutputChannelLogger();
    subs.push(logger);
    registerInstance("logger", logger);

    const logProvider = registerLogProvider(subs, configSvc);
    registerStatusBarItems(logProvider, subs, configSvc);
    registerLogExplorer(logProvider, context, configSvc);

    if (isDevEnv()) {
        checkRgPath().then(found => {
            if (!found) {
                vscode.window.showWarningMessage("rg could not be found");
            } else {
                vscode.window.showInformationMessage("rg found");
            }
        });
    }

    if (isDevEnv()) {
        // logMock.start();
    }
}

// this method is called when your extension is deactivated
export function deactivate() { }
