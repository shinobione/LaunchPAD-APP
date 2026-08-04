#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${VISUAL_BASE_URL:-http://127.0.0.1:4173/}"
OUTPUT_DIR="${VISUAL_OUTPUT_DIR:-artifacts/visual-actual}"
CHROME_BIN="${CHROME_BIN:-google-chrome}"
MIN_BYTES="${VISUAL_MIN_BYTES:-15000}"
SERVER_LOG="${VISUAL_SERVER_LOG:-/tmp/launchpad-visual-server.log}"
mkdir -p "$OUTPUT_DIR"

run_pwa_update_smoke() {
  local profile output
  profile="$(mktemp -d)"
  output="$(mktemp)"

  timeout --signal=TERM 45s "$CHROME_BIN" \
    --headless=new --no-sandbox --disable-gpu \
    --disable-background-networking --disable-component-update --disable-sync \
    --disable-features=OptimizationHints,OptimizationGuideModelDownloading,MediaRouter,Translate \
    --metrics-recording-only --no-first-run --disable-default-apps \
    --virtual-time-budget=7000 --run-all-compositor-stages-before-draw \
    --user-data-dir="$profile" --dump-dom \
    "${BASE_URL}tests/pwa-update-smoke.html" > "$output"

  grep -q 'PWA UPDATE READY DEFER AUDIO LATER SESSION SINGLE RELOAD' "$output"
  ! grep -q 'PWA UPDATE ERROR' "$output"
  rm -rf "$profile" "$output"
  echo "PWA update prompt smoke test passed"
}

run_audio_startup_smoke() {
  local profile output
  profile="$(mktemp -d)"
  output="$(mktemp)"

  timeout --signal=TERM 45s "$CHROME_BIN" \
    --headless=new --no-sandbox --disable-gpu \
    --disable-background-networking --disable-component-update --disable-sync \
    --disable-features=OptimizationHints,OptimizationGuideModelDownloading,MediaRouter,Translate \
    --metrics-recording-only --no-first-run --disable-default-apps \
    --virtual-time-budget=9000 \
    --user-data-dir="$profile" --dump-dom \
    "${BASE_URL}tests/audio-startup-smoke.html" > "$output"

  grep -q 'STUDIO AUDIO READY WATCHDOG SOURCE REBUILD RETRY' "$output"
  ! grep -q 'STUDIO AUDIO ERROR' "$output"
  rm -rf "$profile" "$output"
  echo "Studio audio startup recovery smoke test passed"
}

run_mobile_studio_smoke() {
  local profile marker
  profile="$(mktemp -d)"
  marker='__mobile_studio_result__'

  timeout --signal=TERM 15s "$CHROME_BIN" \
    --headless=new --no-sandbox --disable-gpu \
    --disable-background-networking --disable-component-update --disable-sync \
    --disable-features=OptimizationHints,OptimizationGuideModelDownloading,MediaRouter,Translate \
    --metrics-recording-only --no-first-run --disable-default-apps \
    --force-device-scale-factor=1 --window-size=390,844 \
    --virtual-time-budget=9000 \
    --user-data-dir="$profile" \
    "${BASE_URL}tests/mobile-studio-smoke.html" >/dev/null 2>&1 || true

  rm -rf "$profile"
  if grep -q "/${marker}/error-" "$SERVER_LOG"; then
    grep "/${marker}/error-" "$SERVER_LOG" >&2 || true
    return 1
  fi
  if ! grep -q "/${marker}/ready" "$SERVER_LOG"; then
    echo "Mobile Studio browser test did not report a result." >&2
    return 1
  fi
  echo "Mobile Studio smoke test passed"
}

capture() {
  local name="$1" width="$2" height="$3" view="$4"
  local profile output bytes attempt
  output="$OUTPUT_DIR/$name.png"

  for attempt in 1 2 3; do
    profile="$(mktemp -d)"
    rm -f "$output"

    timeout --signal=TERM 45s "$CHROME_BIN" \
      --headless=new --no-sandbox --disable-gpu --hide-scrollbars \
      --disable-background-networking --disable-component-update --disable-sync \
      --disable-features=OptimizationHints,OptimizationGuideModelDownloading,MediaRouter,Translate \
      --metrics-recording-only --no-first-run --disable-default-apps \
      --force-device-scale-factor=1 --window-size="${width},${height}" \
      --virtual-time-budget=6500 --run-all-compositor-stages-before-draw \
      --user-data-dir="$profile" --screenshot="$output" \
      "${BASE_URL}tests/visual-capture.html?view=${view}" || true

    rm -rf "$profile"
    bytes="$(stat -c%s "$output" 2>/dev/null || echo 0)"
    if (( bytes >= MIN_BYTES )); then
      echo "Captured $name (${bytes} bytes, attempt ${attempt})"
      return 0
    fi

    echo "Retrying $name: incomplete capture (${bytes} bytes, attempt ${attempt})" >&2
    sleep 2
  done

  echo "Visual capture failed for $name after three attempts." >&2
  return 1
}

run_pwa_update_smoke
run_audio_startup_smoke
run_mobile_studio_smoke
capture home-desktop 1440 1000 'home'
capture home-mobile 390 844 'home'
capture albums-desktop 1440 1000 'albums'
capture lyrics-desktop 1440 1000 'lyrics%3Dbefore-the-noise'
capture studio-mobile 390 844 'studio%3Dthick'
capture studio-mobile-landscape 844 390 'studio%3Dthick'
capture favorites-mobile 390 844 'favorites'
capture about-mobile 390 844 'about'
