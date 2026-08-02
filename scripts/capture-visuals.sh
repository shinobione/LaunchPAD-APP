#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${VISUAL_BASE_URL:-http://127.0.0.1:4173/}"
OUTPUT_DIR="${VISUAL_OUTPUT_DIR:-artifacts/visual-actual}"
CHROME_BIN="${CHROME_BIN:-google-chrome}"
mkdir -p "$OUTPUT_DIR"

capture() {
  local name="$1" width="$2" height="$3" view="$4"
  local profile output
  profile="$(mktemp -d)"
  output="$OUTPUT_DIR/$name.png"

  timeout --signal=TERM 35s "$CHROME_BIN" \
    --headless=new --no-sandbox --disable-gpu --hide-scrollbars \
    --disable-background-networking --disable-component-update --disable-sync \
    --disable-features=OptimizationHints,OptimizationGuideModelDownloading,MediaRouter,Translate \
    --metrics-recording-only --no-first-run --disable-default-apps \
    --force-device-scale-factor=1 --window-size="${width},${height}" \
    --virtual-time-budget=5000 --run-all-compositor-stages-before-draw \
    --user-data-dir="$profile" --screenshot="$output" \
    "${BASE_URL}tests/visual-capture.html?view=${view}" || test -s "$output"

  test -s "$output"
  rm -rf "$profile"
  echo "Captured $name"
}

capture home-desktop 1440 1000 'home'
capture home-mobile 390 844 'home'
capture albums-desktop 1440 1000 'albums'
capture lyrics-desktop 1440 1000 'lyrics%3Dbefore-the-noise'
capture favorites-mobile 390 844 'favorites'
capture about-mobile 390 844 'about'
