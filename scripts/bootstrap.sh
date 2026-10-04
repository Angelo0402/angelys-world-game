#!/usr/bin/env bash
# Fresh, platform-correct install. Fixes the two environment blockers:
# 1) Vite/Rolldown native binding missing from a copied node_modules
# 2) Gradle wrapper has no distribution until the first download
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v npm >/dev/null; then
  echo "Need Node.js 22+ and npm on PATH." >&2
  exit 1
fi

echo "==> Installing npm packages for this OS/CPU (including Rolldown binding)"
rm -rf node_modules
npm ci
node scripts/check-native.mjs

GRADLE_HOME="${GRADLE_USER_HOME:-$ROOT/.gradle-home}"
export GRADLE_USER_HOME="$GRADLE_HOME"
mkdir -p "$GRADLE_HOME"

echo "==> Prefetching Gradle 8.11.1 into $GRADLE_USER_HOME"
if [[ -x "$ROOT/android/gradlew" ]]; then
  (cd "$ROOT/android" && ./gradlew --version --quiet)
fi

echo "Bootstrap OK. Dev server: npm run dev   APK: npm run apk"
