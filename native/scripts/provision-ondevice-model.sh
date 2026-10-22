#!/usr/bin/env bash
set -euo pipefail

TARGET="${1:-}"
MODEL_NAME="qwen3_0.6b_nothink_q4_block32_ekv1280.litertlm"
MODEL_SHA256="2df6821ec12702dafd33915e7a1a1adc7c4b053f3672fd9555dfaf3a114c4139"
MODEL_URL="https://huggingface.co/litert-community/Qwen3-0.6B-int4/resolve/6aa2daf8aba4aa456797fb8040b36a3948bcfda7/${MODEL_NAME}"
MODEL_CACHE="${TMPDIR:-/tmp}/signal-ondevice-model-${MODEL_SHA256}.litertlm"

if [[ "$TARGET" != "android" && "$TARGET" != "ios-simulator" ]]; then
  echo "Usage: $0 android|ios-simulator" >&2
  exit 2
fi

if [[ ! -f "$MODEL_CACHE" ]]; then
  curl --fail --location --retry 3 --output "${MODEL_CACHE}.partial" "$MODEL_URL"
  mv "${MODEL_CACHE}.partial" "$MODEL_CACHE"
fi

ACTUAL_SHA256="$(shasum -a 256 "$MODEL_CACHE" | awk '{print $1}')"
if [[ "$ACTUAL_SHA256" != "$MODEL_SHA256" ]]; then
  rm -f "$MODEL_CACHE"
  echo "Model SHA-256 verification failed." >&2
  exit 1
fi

if [[ "$TARGET" == "android" ]]; then
  adb shell pm path com.signal.app >/dev/null
  adb push "$MODEL_CACHE" "/data/local/tmp/${MODEL_NAME}"
  adb shell run-as com.signal.app sh -c 'mkdir -p files/ondevice'
  adb shell run-as com.signal.app cp "/data/local/tmp/${MODEL_NAME}" "files/ondevice/${MODEL_NAME}"
  adb shell rm -f "/data/local/tmp/${MODEL_NAME}"
else
  SIMULATOR_APP_CONTAINER="$(xcrun simctl get_app_container booted com.signal.app data)"
  MODEL_DIRECTORY="${SIMULATOR_APP_CONTAINER}/Library/Application Support/ondevice"
  mkdir -p "$MODEL_DIRECTORY"
  cp "$MODEL_CACHE" "${MODEL_DIRECTORY}/${MODEL_NAME}"
fi

echo "Verified model provisioned to ${TARGET}. Model bytes are not added to Git or the app package."
