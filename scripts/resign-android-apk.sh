#!/usr/bin/env bash
# Re-signs an APK with the EAS Android keystore so it can update an EAS-installed app in place.
#   scripts/resign-android-apk.sh <credentials.json> [in.apk] [out.apk]
# credentials.json comes from `npx eas-cli credentials --platform android`
# (profile "preview" → "credentials.json" → "Download credentials from EAS to credentials.json").
# Never commit credentials.json or the keystore; secrets are read from the file and never printed.
set -euo pipefail

CREDS="${1:?usage: $0 <credentials.json> [in.apk] [out.apk]}"
IN="${2:-$HOME/Downloads/Shovar-android-arm64.apk}"
OUT="${3:-$HOME/Downloads/Shovar-android-eas-signed.apk}"
export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@17}"
export PATH="$JAVA_HOME/bin:$PATH"
APKSIGNER="${ANDROID_HOME:-/opt/homebrew/share/android-commandlinetools}/build-tools/36.0.0/apksigner"

read_field() { node -e 'const c=require(require("path").resolve(process.argv[1])).android.keystore;process.stdout.write(String(c[process.argv[2]]??""))' "$CREDS" "$1"; }
KS="$(read_field keystorePath)"
case "$KS" in /*) ;; *) KS="$(dirname "$CREDS")/$KS" ;; esac
export KS_PASS="$(read_field keystorePassword)"
export KEY_PASS="$(read_field keyPassword)"
ALIAS="$(read_field keyAlias)"

"$APKSIGNER" sign --ks "$KS" --ks-key-alias "$ALIAS" --ks-pass env:KS_PASS --key-pass env:KEY_PASS \
  --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true --out "$OUT" "$IN"
"$APKSIGNER" verify --print-certs "$OUT" | grep -E "SHA-256|Verifies" | head -3
echo "Signed: $OUT"
