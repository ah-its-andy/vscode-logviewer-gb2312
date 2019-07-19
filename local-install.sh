#!/bin/bash

set -euxo pipefail

rm -f ./*.vsix
yarn
vsce package

code --install-extension vscode-log-viewer-gb2312-*.vsix --force