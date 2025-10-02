import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dashdice.app',
  appName: 'DashDice',
  webDir: 'capacitor-public',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    url: 'https://dashdice.gg',
    cleartext: true
  },
  ios: {
    contentInset: 'automatic',
    scheme: 'App',
    allowsLinkPreview: false,
    scrollEnabled: true,
    overrideUserAgent: 'DashDice Mobile App',
    limitsNavigationsToAppBoundDomains: true
  },
  plugins: {
    CapacitorHttp: {
      enabled: true
    }
  }
};

export default config;
