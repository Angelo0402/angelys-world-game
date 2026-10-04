/**
 * Capacitor hooks for the Android APK. In the browser these imports still resolve;
 * the calls no-op when the WebView plugins are not present.
 */
import { App } from "@capacitor/app";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";

export async function bootNative() {
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  const native = typeof cap?.isNativePlatform === "function" && cap.isNativePlatform();
  if (!native) return;
  try {
    await StatusBar.hide();
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setOverlaysWebView({ overlay: true });
  } catch {
    /* older WebViews */
  }
  try {
    await SplashScreen.hide();
  } catch {
    /* */
  }
  App.addListener("backButton", ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back();
      return;
    }
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
  });
}
