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
      launchShowDuration: 2000,
      backgroundColor: "#1a1a2e",
      androidSplashResourceName: "splash",
      iosSplashResourceName: "Default"
    },
    StatusBar: {
      style: "dark"
    }
  }
};

export default config;
