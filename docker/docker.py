#!/usr/bin/python3

import os
from os import path
import sys
import subprocess
import argparse

parser = argparse.ArgumentParser()

parser.add_argument("--build", default=False, action="store_true")
parser.add_argument("--push", default=False, action="store_true")
parser.add_argument("--run", default=False, nargs="?", const="./run_test.sh")

args = parser.parse_args()

script_dir: str = path.dirname(path.realpath(sys.argv[0]))

os.chdir(script_dir)

tag = "log-viewer-docker:latest"
registry = "registry.gitlab.com/berublan/vscode-log-viewer"

if args.build:
    subprocess.run(["docker", "build", "-t", tag, "."])

if args.push:
    subprocess.run(["docker", "tag", tag, registry])
    subprocess.run(["docker", "push", registry])

if args.run:
    repo_dir = path.realpath(path.join(script_dir, ".."))
    subprocess.run(["docker", "run", "--rm", "--interactive", "--tty",
                    "--volume", f"{repo_dir}:/mnt/src", tag, args.run])


# interesting images:
# https://hub.docker.com/r/canvadev/ci-docker-node-yarn-chrome-xvfb
# https://hub.docker.com/r/chriscamicas/node-xvfb
