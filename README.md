# vscode-log-viewer-gb2312 README

Log file viewer.

## Features

* Monitor files based on glob pattern ([picomatch](https://github.com/micromatch/picomatch))
    * Absolute or relative to workspace
    * Supports windows UNC paths
* Clear log view (without modifying the file)
* Automatically follow and unfollow tail based on scroll position
* Support for large log files (only loads last 64KB)
* Log highlighting (log4net)

## Configuration

* `logViewer.watch`: Array of watches. A watch is either
    * A glob pattern.
    * An object defining a watch:
        * `title`: Text to use in the explorer view and for the tab name.
        * `pattern` (required): Glob pattern.
        * `workspaceName`: When in a multi-root workspace, which workspace should be used to resolve relative patterns.
        * `options`: Override options for this pattern. See available options below.
    * An object defining a group:
        * `groupName`: Name of the group.
        * `watches`: Watches in this group.

* `logViewer.options`
    * `fileCheckInterval` (default=500): Interval in ms to check for changes in current file.
    * `fileListInterval` (default=2000): Interval in ms to search for new files.
    * `ignorePattern` (default="(node_modules|.git)"): This pattern is matched against each segment in the path. Each directory and the file.
    * `encoding` (default="utf8"): Encoding to use when reading the files. (https://nodejs.org/api/buffer.html#buffer_buffers_and_character_encodings).

* `logViewer.windows.allowBackslashAsPathSeparator` (default=true): Allow to use \"\\\" (as well as \"/\") as a path separator on windows. Won't be able to escape certain pattern characters when enabled.

* `logViewer.showStatusBarItemOnChange` (default=false): Show an item in the status bar when a watched pattern changes, to quickly access it.

* `logViewer.chunkSizeKb` (default=64): Chunk size in kilobytes used to calculate the size of the last chunk to load in the viewer. The loaded last chunk will always be less than 2 * chunkSizeKb.


## Example
```json
{
    "logViewer.watch": [
        {
            "title": "Demo App",
            "pattern": "/home/berni/Documentos/src/logger-sample/Logs/*.log"
        },
        {
            "title": "/var/logs",
            "pattern": "/var/log/**/*log"
        },
        {
            "title": "npm logs",
            "pattern": "/home/berni/.npm/_logs/*.log"
        }
    ]
}
```

![Screenshot](https://gitlab.com/berublan/vscode-log-viewer-gb2312/raw/master/images/screenshot1.png)

![Screenshot](https://gitlab.com/berublan/vscode-log-viewer-gb2312/raw/master/images/screenshot2.png)
