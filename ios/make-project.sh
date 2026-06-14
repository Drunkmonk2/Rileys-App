#!/usr/bin/env bash
# One command to (re)generate and open the Xcode project on your Mac.
#   1. copies the latest web app into the bundle
#   2. runs XcodeGen to create RileysApp.xcodeproj
#   3. opens it in Xcode
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE"

if ! command -v xcodegen >/dev/null 2>&1; then
  echo "XcodeGen is required. Install it with:  brew install xcodegen"
  exit 1
fi

./scripts/sync-web.sh
xcodegen generate
echo "Opening RileysApp.xcodeproj ..."
open RileysApp.xcodeproj
