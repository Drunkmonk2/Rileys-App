#!/usr/bin/env bash
# Copies the canonical web app (repo root) into the iOS app bundle folder so
# the native wrapper ships the exact same code. Run this before building.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$HERE/../.." && pwd)"
DEST="$HERE/../RileysApp/Web"

echo "Syncing web app -> $DEST"
rm -rf "$DEST"
mkdir -p "$DEST"

cp "$REPO_ROOT/index.html"        "$DEST/"
cp "$REPO_ROOT/manifest.json"     "$DEST/" 2>/dev/null || true
cp "$REPO_ROOT/service-worker.js" "$DEST/" 2>/dev/null || true
cp -R "$REPO_ROOT/css"            "$DEST/"
cp -R "$REPO_ROOT/js"             "$DEST/"
cp -R "$REPO_ROOT/icons"          "$DEST/"

echo "Done."
