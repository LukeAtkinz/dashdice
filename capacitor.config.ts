import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dashdice.app',
  appName: 'DashDice',
  webDir: 'out',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      backgroundColor: "#1a1a2e",
      splashFullScreen: true,
      splashImmersive: true,
      layoutName: "launch_splash",
      useDialog: false,
      launchAutoHide: true,
      showSpinner: false
    },
    StatusBar: {
      style: "dark"
    }
  }
};

export default config;
