import * as vscode from "vscode";
import * as event from "events";

export type Event<T> = vscode.Event<T>;
export type Disposable = vscode.Disposable;
export type WorkspaceFolder = vscode.WorkspaceFolder;