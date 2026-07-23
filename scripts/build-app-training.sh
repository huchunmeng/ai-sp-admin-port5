#!/bin/bash
set -e
cd "$(dirname "$0")/.."
npm install
npm run build --workspace=ai-sp-app-training