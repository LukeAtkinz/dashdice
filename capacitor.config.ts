import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dashdice.app',
  appName: 'DashDice',
  webDir: 'capacitor-public',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    url: 'https://dashdice-1dib-lmwq4amif-dash-dice.vercel.app',
    cleartext: true
  },
  ios: {
    contentInset: 'automatic',
    scheme: 'App'
  }
};

export default config;
