#!/bin/bash
# deploy.sh — copy built PWA files to firmware LittleFS data folder.
#
# Run this after any app change (sw.js is rebuilt automatically by GitHub
# Actions, but you can also run: npm run build && ./deploy.sh locally).
#
# After deploy:
#   1. Open Arduino IDE
#   2. Tools → ESP32 Sketch Data Upload
#   3. Flash the firmware if needed
#
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SRC="$SCRIPT_DIR/src"
DEST="$SCRIPT_DIR/../MiniHead/Firmware/MiniHead/main/data/pwa"

if [ ! -d "$SRC" ]; then
  echo "ERROR: src/ not found at $SRC" >&2
  exit 1
fi

mkdir -p "$DEST/css" "$DEST/js" "$DEST/icons"

cp "$SRC/index.html"   "$DEST/"
cp "$SRC/sw.js"        "$DEST/"
cp "$SRC/manifest.json" "$DEST/"
cp "$SRC/css/"*.css    "$DEST/css/"
cp "$SRC/js/"*.js      "$DEST/js/"
cp "$SRC/icons/"*.png  "$DEST/icons/"

echo "Deployed to $DEST"
echo ""
echo "Next: Arduino IDE → Tools → ESP32 Sketch Data Upload"
