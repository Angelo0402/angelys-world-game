#!/usr/bin/env bash
# Build Angelys-World-Parlyn.apk without touching the Phaser APK or android/.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -d parlyn-dist ]]; then
  echo "parlyn-dist missing — run npm run build:parlyn first" >&2
  exit 1
fi

if [[ ! -d android-parlyn/capacitor-cordova-android-plugins && -d android/capacitor-cordova-android-plugins ]]; then
  mkdir -p android-parlyn
  tar -C android -cf - capacitor-cordova-android-plugins | tar -C android-parlyn -xf -
fi

# Keep Capacitor web assets in sync with the Parlyn Vite build only.
rm -rf android-parlyn/app/src/main/assets/public
mkdir -p android-parlyn/app/src/main/assets/public
cp -a parlyn-dist/. android-parlyn/app/src/main/assets/public/

cat > android-parlyn/app/src/main/assets/capacitor.config.json <<'JSON'
{
  "appId": "com.angelysworld.parlyn",
  "appName": "Angely's World Parlyn",
  "webDir": "parlyn-dist",
  "android": {
    "path": "android-parlyn",
    "allowMixedContent": true,
    "backgroundColor": "#120d1f"
  }
}
JSON

cat > android-parlyn/app/src/main/assets/capacitor.plugins.json <<'JSON'
[
  {
    "pkg": "@capacitor/app",
    "classpath": "com.capacitorjs.plugins.app.AppPlugin"
  },
  {
    "pkg": "@capacitor/splash-screen",
    "classpath": "com.capacitorjs.plugins.splashscreen.SplashScreenPlugin"
  },
  {
    "pkg": "@capacitor/status-bar",
    "classpath": "com.capacitorjs.plugins.statusbar.StatusBarPlugin"
  }
]
JSON

# Snapshot the Phaser APK so we can prove this script never overwrites it.
PHASER_APK="$ROOT/Angelys-World.apk"
if [[ -f "$PHASER_APK" ]]; then
  PHASER_HASH=$(sha256sum "$PHASER_APK" | awk '{print $1}')
fi

bash "$ROOT/scripts/gradlew-parlyn.sh" assembleDebug

OUT="$ROOT/android-parlyn/app/build/outputs/apk/debug/app-debug.apk"
if [[ ! -f "$OUT" ]]; then
  echo "Parlyn APK was not produced at $OUT" >&2
  exit 1
fi

cp -f "$OUT" "$ROOT/Angelys-World-Parlyn.apk"

if [[ -n "${PHASER_HASH:-}" ]]; then
  NOW=$(sha256sum "$PHASER_APK" | awk '{print $1}')
  if [[ "$NOW" != "$PHASER_HASH" ]]; then
    echo "Refusing to continue: Angelys-World.apk changed during the Parlyn APK build" >&2
    exit 1
  fi
fi

echo "Wrote $ROOT/Angelys-World-Parlyn.apk"
ls -lh "$ROOT/Angelys-World-Parlyn.apk"
