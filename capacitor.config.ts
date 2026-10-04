import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.angelysworld.game",
  appName: "Angely's World",
  webDir: "dist",
  android: {
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
