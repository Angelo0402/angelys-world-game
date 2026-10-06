import type { CapacitorConfig } from "@capacitor/cli";

/** Separate Capacitor app for the Parlyn Engine build. Does not replace com.angelysworld.game. */
const config: CapacitorConfig = {
  appId: "com.angelysworld.parlyn",
  appName: "Angely's World Parlyn",
  webDir: "parlyn-dist",
  android: {
    path: "android-parlyn",
    allowMixedContent: true,
    backgroundColor: "#120d1f",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      launchAutoHide: true,
      backgroundColor: "#120d1f",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#120d1f",
    },
  },
};

export default config;
