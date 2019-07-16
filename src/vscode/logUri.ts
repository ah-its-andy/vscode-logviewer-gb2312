import * as vscode from "vscode";
import * as path from "path";

export interface WatchForUri {
    readonly id: number;
    readonly pattern: string;
    readonly title?: string;
    readonly workspaceName: string | undefined;
}

export function toLogUri(w: WatchForUri): vscode.Uri {
    //the only way I found to control the title of the tab is with the path of the uri
    //so if we have a title use it as the path of the uri
    let tabTitle = w.title || w.pattern;

    //add extension so that is asociated with appropiate syntax highlighting
    const ext = path.extname(w.pattern);
    if (ext && ext !== "." && ext.indexOf("*") === -1) {
        if (!tabTitle.endsWith(ext)) {
            tabTitle = tabTitle + ext;
        }
    } else {
        // with .log-viewer it will pick our log highlighting
        tabTitle = tabTitle + ".log-viewer";
    }

    //"logviewer" will become the authority part
    const json = JSON.stringify(w);
    const uriStr = `log://logviewer/${encodeURIComponent(tabTitle)}?${encodeURIComponent(json)}`;
    return vscode.Uri.parse(uriStr);
}

export function fromLogUri(logUri: vscode.Uri): WatchForUri {
    const w: WatchForUri = JSON.parse(logUri.query);
    return w;
}