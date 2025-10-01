import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dashdice.app',
  appName: 'DashDice',
  webDir: 'capacitor-public',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    url: 'http://localhost:3001',
    cleartext: true
  },
  ios: {
    contentInset: 'automatic',
    scheme: 'App'
  }
};

export default config;
