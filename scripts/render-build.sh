#!/usr/bin/env bash
# Render native (non-Docker) monolith build: Node front-end → Backend/static, then pip deps.
set -euo pipefail

NODE_VERSION="${NODE_VERSION:-20.18.0}"
NODE_DIR="node-v${NODE_VERSION}-linux-x64"

if [[ ! -d "$NODE_DIR" ]]; then
  curl -fsSLO "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz"
  tar -xJf "node-v${NODE_VERSION}-linux-x64.tar.xz"
fi
export PATH="${PWD}/${NODE_DIR}/bin:${PATH}"

node --version
npm --version

cd frontend
npm ci
npm run build

mkdir -p ../Backend/static
rm -rf ../Backend/static/*
cp -r dist/. ../Backend/static/

cd ../Backend
pip install -r requirements.txt
