import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dashdice.app',
  appName: 'DashDice',
  webDir: 'capacitor-public',
  server: {
    androidScheme: 'https',
    iosScheme: 'https'
  },
  ios: {
    contentInset: 'automatic',
    scheme: 'App',
    allowsLinkPreview: false,
    scrollEnabled: true,
    overrideUserAgent: 'DashDice Mobile App'
  },
  plugins: {
    CapacitorHttp: {
      enabled: true
    }
  }
};

export default config;
