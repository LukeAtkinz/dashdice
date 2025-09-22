# Phase 2: Capacitor Native App Setup

## Overview
Now that your PWA foundation is working, we'll add Capacitor to generate native iOS and Android apps for App Store distribution.

## What Capacitor Does
- Wraps your PWA in native app containers
- Provides access to native device features (camera, notifications, etc.)
- Enables App Store/Google Play distribution
- Maintains your existing web codebase

## Setup Steps

### 1. Install Capacitor
```bash
npm install @capacitor/core @capacitor/cli
npm install @capacitor/ios @capacitor/android
```

### 2. Initialize Capacitor
```bash
npx cap init "DashDice" "com.dashdice.app"
```

### 3. Build Web Assets
```bash
npm run build
```

### 4. Add Platforms
```bash
npx cap add ios
npx cap add android
```

### 5. Sync Web Assets to Native
```bash
npx cap sync
```

### 6. Open in Native IDEs
```bash
npx cap open ios     # Opens Xcode
npx cap open android # Opens Android Studio
```

## Configuration Files

### capacitor.config.ts
```typescript
import { CapacitorConfig } from '@capacitor/cli';

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
```

## Native Features Integration

### Add Popular Plugins
```bash
npm install @capacitor/status-bar @capacitor/splash-screen
npm install @capacitor/haptics @capacitor/share
npm install @capacitor/push-notifications @capacitor/local-notifications
```

### Enhanced Mobile Wrapper
We'll update the MobileWrapper to use native features when available:
- Native haptic feedback instead of web vibration
- Native sharing instead of web share API
- Native notifications for game updates
- Native status bar control

## App Store Requirements

### iOS (App Store)
- **Developer Account**: $99/year Apple Developer Program
- **App Icons**: 1024x1024 for App Store, various sizes for device
- **Screenshots**: iPhone/iPad screenshots for store listing
- **Privacy Policy**: Required for App Store submission
- **App Review**: Apple reviews all submissions

### Android (Google Play)
- **Developer Account**: $25 one-time Google Play Console fee
- **App Icons**: 512x512 for Play Store, various sizes for device
- **Screenshots**: Phone/tablet screenshots for store listing
- **Privacy Policy**: Required for Play Store submission
- **App Signing**: Google Play App Signing recommended

## Development Workflow

### For Web Development (Current)
```bash
npm run dev  # Continue normal web development
```

### For Native Testing
```bash
npm run build    # Build production web assets
npx cap sync     # Copy to native projects
npx cap run ios  # Run on iOS simulator/device
npx cap run android  # Run on Android emulator/device
```

### For Production Builds
```bash
npm run build
npx cap sync
# Then build in Xcode (iOS) or Android Studio (Android)
```

## Safety Measures

### Development Safety
- Web development continues unchanged
- Native features gracefully degrade on web
- Feature detection prevents native-only code on web
- All existing functionality preserved

### Testing Strategy
1. Test PWA thoroughly first (current phase)
2. Test native builds in simulators/emulators
3. Test on real devices before submission
4. Beta testing through TestFlight (iOS) or Internal Testing (Android)

## File Structure After Setup
```
dashdice/
├── android/          # Android native project
├── ios/              # iOS native project
├── capacitor.config.ts
├── src/
│   ├── components/mobile/  # Enhanced for native features
│   └── utils/
│       └── capacitor.ts    # Native feature utilities
└── public/
    └── assets/
        └── icons/          # App icons for all platforms
```

## Ready to Proceed?

After you've tested the PWA functionality and confirmed everything works safely, we can:

1. **Install Capacitor**: Add native app generation capability
2. **Configure Projects**: Set up iOS and Android projects
3. **Add Native Features**: Enhance with device-specific capabilities
4. **Build Apps**: Generate native app packages
5. **Prepare Submissions**: Create store listings and assets

Would you like to proceed with Capacitor installation, or do you want to test the PWA functionality first?
