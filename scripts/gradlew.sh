#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export GRADLE_USER_HOME="${GRADLE_USER_HOME:-$ROOT/.gradle-home}"
mkdir -p "$GRADLE_USER_HOME"
cd "$ROOT/android"
exec ./gradlew "$@"
