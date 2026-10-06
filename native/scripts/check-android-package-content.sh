#!/usr/bin/env bash
set -euo pipefail

if [[ $# -eq 0 ]]; then
  echo "Usage: check-android-package-content.sh <apk-or-aab> [...]" >&2
  exit 2
fi

# Supabase and Ktor contain bare key-prefix and localhost defaults in their own
# code. Match complete credential-like values and configured development URLs.
unsafe_content='apikey_[[:alnum:]_-]{20,}|sb_secret_[[:alnum:]_-]{20,}|TYPESAFE_API_KEY|JEV_API_KEY|http://localhost(:[0-9]{1,5}|/[^[:space:]]*)|http://127\.0\.0\.1(:[0-9]{1,5}|/[^[:space:]]*|$)|http://10\.0\.2\.2(:[0-9]{1,5}|/[^[:space:]]*|$)'

for package in "$@"; do
  if [[ ! -f "$package" ]]; then
    echo "::error::Android package does not exist: $package" >&2
    exit 2
  fi
  if ! unzip -tqq "$package" > /dev/null; then
    echo "::error::Android package archive is invalid: $(basename "$package")" >&2
    exit 2
  fi
  if unzip -p "$package" | strings | grep -Ei "$unsafe_content" > /dev/null; then
    echo "::error::Potential embedded credential or development endpoint found in $(basename "$package"). Package contents are withheld from logs." >&2
    exit 1
  fi
done
