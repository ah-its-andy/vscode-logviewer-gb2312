import * as vscode from "vscode";
import { LogProvider, WatchState } from "./logProvider";
import * as path from "path";
import { openLogResourceCmd } from "./logExplorer";
import { fromLogUri } from "./logUri";
import { ConfigService } from "./config";

const toggleFollowTailCmd = "logviewer.toggleFollowTail";
const clearCmd = "logviewer.clearLogView";
const resetCmd = "logviewer.resetLogView";
const openCurrentFileCmd = "logviewer.openCurrentFile";
const openLastChangedCmd = "logviewer.openLastChanged";

interface StatusBarComponent {
    show(): void;
    hide(): void;
}

let _statusBarItemPriority = 0;

interface Command {
    name: string;
    action: () => void;
}

interface SimpleStatusBarComponentProps {
    command?: Command;
    text: string;
    tooltip?: string;
}

function simpleStatusBarComponent(
    subs: vscode.Disposable[],
    props: SimpleStatusBarComponentProps): vscode.StatusBarItem {
    const item = vscode.window.createStatusBarItem(undefined, _statusBarItemPriority++);
    subs.push(item);
    item.text = props.text;
    if (props.tooltip) {
        item.tooltip = props.tooltip;
    }
    if (props.command) {
        item.command = props.command.name;
        subs.push(vscode.commands.registerCommand(props.command.name, props.command.action));
    }
    return item;
}

function shouldHandle(editor: vscode.TextEditor | undefined): editor is vscode.TextEditor {
    if (!editor) {
        return false;
    }
    return editor.document.uri.scheme === "log";
}

class FollowTailStatusBarComponent implements StatusBarComponent {
    private followTail = true;
    private readonly item: vscode.StatusBarItem;
    constructor(subs: vscode.Disposable[]) {
        this.item = simpleStatusBarComponent(subs, {
            text: "",
            command: {
                name: toggleFollowTailCmd,
                action: () => {
                    const editor = vscode.window.activeTextEditor;
                    if (shouldHandle(editor)) {
                        this.setFollowTail(!this.followTail, editor);
                    }
                },
            },
        });
        subs.push(vscode.window.onDidChangeTextEditorVisibleRanges(this.onDidChangeTextEditorVisibleRanges));
        subs.push(vscode.workspace.onDidChangeTextDocument(this.onDidChangeTextDocument));
    }

    public show(): void {
        this.item.show();
        const editor = vscode.window.activeTextEditor;
        if (shouldHandle(editor)) {
            this.refresh(editor);
        }
    }
    public hide(): void {
        this.item.hide();
    }

    private refresh(editor: vscode.TextEditor) {
        this.item.text = this.followTail ? "$(flame) Don't Follow Tail" : "$(pulse) Follow Tail";
        if (this.followTail) {
            this.jumpToTail(editor);
        }
    }

    private setFollowTail(value: boolean, editor: vscode.TextEditor) {
        if (value === this.followTail) {
            return;
        }
        this.followTail = value;
        this.refresh(editor);
    }

    private jumpToTail(editor: vscode.TextEditor) {
        const lastLineRange = editor.document.lineAt(editor.document.lineCount - 1).range;
        editor.revealRange(lastLineRange);
    }

    private readonly onDidChangeTextEditorVisibleRanges = (e: vscode.TextEditorVisibleRangesChangeEvent) => {
        if (!shouldHandle(e.textEditor)) {
            return;
        }
        if (!e.visibleRanges.length) {
            return;
        }
        const lastLine = e.visibleRanges[e.visibleRanges.length - 1].end.line;
        const lastDocLine = e.textEditor.document.lineCount - 1;
        if (lastLine < lastDocLine) {
            this.setFollowTail(false, e.textEditor);
        } else {
            this.setFollowTail(true, e.textEditor);
        }
    }

    private readonly onDidChangeTextDocument = (e: vscode.TextDocumentChangeEvent) => {
        if (!this.followTail) {
            return;
        }
        const editor = vscode.window.activeTextEditor;
        if (!shouldHandle(editor) || editor.document !== e.document) {
            return;
        }
        if (editor.selection.isEmpty) {
            // hack that prevents text inserted at the end from being selected
            // when the cursor position is at the end of the document
            editor.selection = editor.selection;
        }
        this.jumpToTail(editor);
    }
}

// this item is not contextual to the activeTextEditor
// it's shown whenever a watch changes in the background (if the config is enabled)
class LastChangedStatusBarItem {
    private readonly item: vscode.StatusBarItem;
    private lastState: WatchState | undefined;
    private intervalHandle: NodeJS.Timer | undefined;

    constructor(subs: vscode.Disposable[], private readonly configSvc: ConfigService) {
        this.item = simpleStatusBarComponent(subs, {
            text: "",
            command: {
                name: openLastChangedCmd,
                action: () => {
                    if (this.lastState) {
                        vscode.commands.executeCommand(openLogResourceCmd, [this.lastState.uri.toString()]);
                    }
                    this.clear();
                },
            },
        });

        subs.push(vscode.window.onDidChangeActiveTextEditor(this.onDidChangeActiveTextEditor));
    }

    private readonly onDidChangeActiveTextEditor = (editor: vscode.TextEditor | undefined) => {
        if (!this.lastState) {
            return;
        }
        if (editor && editor.document.uri.toString() === this.lastState.uri.toString()) {
            this.clear();
        }
    }

    private readonly onInterval = () => {
        if (!this.lastState) {
            return;
        }
        const secs = Math.round((Date.now() - this.lastState.lastChangedOn.getTime()) / 1000);
        let timeStr;
        if (secs >= 60) {
            const mins = Math.floor(secs / 60);
            timeStr = `${mins}min`;
        } else {
            timeStr = `${secs}s`;
        }
        this.item.tooltip = `changed ${timeStr} ago`;
    }

    private clear() {
        this.lastState = undefined;
        this.item.hide();
        this.item.text = "";
        this.clearInterval();
    }

    private clearInterval() {
        this.item.tooltip = "";
        if (this.intervalHandle) {
            clearInterval(this.intervalHandle);
            this.intervalHandle = undefined;
        }
    }

    public setLastChanged(state: WatchState): void {
        if (this.configSvc.get("showStatusBarItemOnChange")) {
            this.lastState = state;
            if (!this.intervalHandle) {
                this.intervalHandle = setInterval(this.onInterval, 1000);
            } else {
                this.onInterval();
            }
            const w = fromLogUri(state.uri);
            const title = w.title || w.pattern;
            this.item.text = `$(bell) Changes in: ${title}`;
            this.item.show();
        } else {
            this.clear();
        }
    }
}

//icons in https://octicons.github.com/

export function registerStatusBarItems(logProvider: LogProvider, subs: vscode.Disposable[], configSvc: ConfigService) {

    // last changed watch
    const lastChangeItem = new LastChangedStatusBarItem(subs, configSvc);

    // watch info
    function setWatchingInfo(state: WatchState | undefined) {
        if (state && state.lastFileName) {
            watchingInfoItem.text = "$(file-text) " + path.basename(state.lastFileName);
            watchingInfoItem.tooltip = state.lastFileName;
        } else {
            watchingInfoItem.text = "";
            watchingInfoItem.tooltip = "";
        }
    }

    const watchingInfoItem = simpleStatusBarComponent(subs, {
        text: "",
        tooltip: "",
        command: {
            name: openCurrentFileCmd,
            action: async () => {
                const activeEditor = vscode.window.activeTextEditor;
                if (!activeEditor) { return; }
                const logUri = activeEditor.document.uri;
                if (logUri.scheme !== "log") { return; }
                const state = logProvider.get(logUri);
                if (state && state.lastFileName) {
                    const doc = await vscode.workspace.openTextDocument(state.lastFileName);
                    const _ = await vscode.window.showTextDocument(doc);
                }
            }
        }
    });

    //follow tail

    const followTailComponent = new FollowTailStatusBarComponent(subs);

    //reset

    const resetItem = simpleStatusBarComponent(subs, {
        text: "$(history) Reset",
        command: {
            name: resetCmd,
            action: async () => {
                if (vscode.window.activeTextEditor) {
                    const uri = vscode.window.activeTextEditor.document.uri;
                    logProvider.restoreContents(uri);
                }
            }
        }
    });

    //clear

    const clearItem = simpleStatusBarComponent(subs, {
        text: "$(x) Clear",
        command: {
            name: clearCmd,
            action: async () => {
                if (vscode.window.activeTextEditor) {
                    const uri = vscode.window.activeTextEditor.document.uri;
                    logProvider.clearContents(uri);
                }
            }
        }
    });

    // common

    // log file contextual items
    const statusBarItems: StatusBarComponent[] = [followTailComponent, clearItem, resetItem, watchingInfoItem];

    function checkShow(editor: vscode.TextEditor | undefined) {
        if (shouldHandle(editor)) {
            for (const item of statusBarItems) {
                item.show();
            }
            setWatchingInfo(logProvider.get(editor.document.uri));
        } else {
            for (const item of statusBarItems) {
                item.hide();
            }
        }
    }

    checkShow(vscode.window.activeTextEditor);

    subs.push(vscode.window.onDidChangeActiveTextEditor(checkShow));

    subs.push(
        logProvider.onChange(change => {
            const editor = vscode.window.activeTextEditor;
            // implies shouldHandle == true because change uri should only be a "log://..." uri
            if (editor && editor.document.uri.toString() === change.uri.toString()) {
                setWatchingInfo(change);
            } else {
                lastChangeItem.setLastChanged(change);
            }
        })
    );
}
