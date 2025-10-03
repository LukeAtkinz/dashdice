import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dashdice.app',
  appName: 'DashDice',
  webDir: 'capacitor-public',
  server: {
    url: 'https://dashdice.gg',
    androidScheme: 'https',
    iosScheme: 'https',
    allowNavigation: ['dashdice.gg', '*.dashdice.gg']
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
