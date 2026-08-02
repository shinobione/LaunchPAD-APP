#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${VISUAL_BASE_URL:-http://127.0.0.1:4173/}"
OUTPUT_DIR="${VISUAL_OUTPUT_DIR:-artifacts/visual-actual}"
CHROME_BIN="${CHROME_BIN:-google-chrome}"
mkdir -p "$OUTPUT_DIR"

capture() {
  local name="$1" width="$2" height="$3" route="$4"
  local profile
  profile="$(mktemp -d)"
  "$CHROME_BIN" --headless=new --no-sandbox --disable-gpu --hide-scrollbars \
    --force-device-scale-factor=1 --window-size="${width},${height}" \
    --virtual-time-budget=14000 --run-all-compositor-stages-before-draw \
    --user-data-dir="$profile" --screenshot="$OUTPUT_DIR/$name.png" \
    "${BASE_URL}?visual-test=1${route}"
  rm -rf "$profile"
}

capture home-desktop 1440 1000 '#home'
capture home-mobile 390 844 '#home'
capture albums-desktop 1440 1000 '#albums'
capture lyrics-desktop 1440 1000 '#lyrics=before-the-noise'
capture favorites-mobile 390 844 '#favorites'
capture about-mobile 390 844 '#about'
