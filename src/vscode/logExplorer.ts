import * as vscode from "vscode";
import { LogProvider } from "./logProvider";
import { toLogUri } from "./logUri";
import * as path from "path";
import { WatchEntry } from "../common/config";
import { ConfigService } from "./config";

export const openLogResourceCmd = "logviewer.openLogResource";
const unwatchCmd = "logviewer.unwatchLogResource";
const unwatchAllCmd = "logviewer.unwatchAll";

interface GroupItem {
    kind: "group";
    readonly name: string;
    readonly items: Item[];
}

interface WatchItem {
    kind: "watch";
    readonly title?: string;
    readonly pattern: string;
    readonly uri: vscode.Uri;
}

type Item = GroupItem | WatchItem;

function toItem(x: WatchEntry): Item {
    if (x.kind === "group") {
        return {
            kind: "group",
            name: x.groupName,
            items: x.watches.map(toItem),
        };
    } else {
        return {
            kind: "watch",
            pattern: x.pattern,
            title: x.title,
            uri: toLogUri(x)
        };
    }
}

class LogExplorer implements vscode.TreeDataProvider<Item>, vscode.Disposable {

    private readonly disposable: vscode.Disposable;

    public static readonly ViewId: string = "logExplorer";

    private readonly _onDidChange: vscode.EventEmitter<undefined>;

    private readonly eyeIconPath: Readonly<{ light: string, dark: string }>;

    constructor(
        private readonly logProvider: LogProvider,
        context: vscode.ExtensionContext,
        private readonly configSvc: ConfigService
    ) {
        this._onDidChange = new vscode.EventEmitter();

        this.disposable = vscode.Disposable.from(
            this._onDidChange,
            configSvc.onChange(() => {
                this.logProvider.unWatchAll(); // ???
                this._onDidChange.fire();
            })
        );

        this.eyeIconPath = {
            light: path.join(context.extensionPath, "images", "light", "baseline-visibility-24px.svg"),
            dark: path.join(context.extensionPath, "images", "dark", "baseline-visibility-24px.svg"),
        };
    }

    public get onDidChangeTreeData() {
        return this._onDidChange.event;
    }

    public reload() {
        this._onDidChange.fire();
    }

    public getTreeItem(element: Item) {
        if (element.kind === "group") {
            return new vscode.TreeItem(element.name, vscode.TreeItemCollapsibleState.Expanded);
        } else {
            const watching = this.logProvider.has(element.uri);
            const name = element.title || element.pattern;
            const item = new vscode.TreeItem(name);
            if (watching) {
                item.iconPath = this.eyeIconPath;
                item.contextValue = "watching";
            } else {
                item.iconPath = undefined; //vscode.ThemeIcon.File;
                item.contextValue = undefined;
            }
            item.command = {
                command: openLogResourceCmd,
                arguments: [element.uri.toString()],
                title: name,
                tooltip: name
            };
            return item;
        }
    }

    public getChildren(element?: Item): Item[] | undefined {
        if (element === undefined) {
            // root
            return this.configSvc.getWatches().map(toItem);
        } else if (element.kind === "group") {
            return element.items;
        }
    }

    public dispose() {
        this.disposable.dispose();
    }
}

export function registerLogExplorer(
    logProvider: LogProvider,
    context: vscode.ExtensionContext,
    configSvc: ConfigService
) {

    const logExplorer = new LogExplorer(logProvider, context, configSvc);

    context.subscriptions.push(logExplorer);
    context.subscriptions.push(
        vscode.window.registerTreeDataProvider(LogExplorer.ViewId, logExplorer)
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(openLogResourceCmd, async (logUri) => {
            const uri = vscode.Uri.parse(logUri);
            logProvider.reload(uri);
            const doc = await vscode.workspace.openTextDocument(uri);
            logExplorer.reload();
            const _ = await vscode.window.showTextDocument(doc, { preview: false });
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(unwatchCmd, (x) => {
            let uri: vscode.Uri;
            if (typeof x === "string") {
                uri = vscode.Uri.parse(x);
            } else if (x.uri instanceof vscode.Uri) {
                uri = x.uri;
            } else {
                return;
            }
            logProvider.unWatch(uri);
            logExplorer.reload();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(unwatchAllCmd, () => {
            logProvider.unWatchAll();
            logExplorer.reload();
        })
    );
}
