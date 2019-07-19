#!/bin/bash
set -euxo pipefail

# this export is required
export DISPLAY=:99.0

if [ -z "$(pidof /usr/bin/Xvfb)" ]
then
    Xvfb -ac $DISPLAY &
fi

mkdir -p /builds/berublan/vscode-log-viewer-gb2312
cd /builds/berublan/vscode-log-viewer-gb2312
# copy to avoid modifying in source
cp -r /mnt/src/. .
if [ -d /.vscode-test ]
then
    mv /.vscode-test .
fi

yarn install
yarn run build
yarn run test

/bin/bash