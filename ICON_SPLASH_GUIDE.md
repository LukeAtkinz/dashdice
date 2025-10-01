# DashDice Icon and Splash Screen Guide

## Current Icon Structure
Your app icons are located in `/public/App Icons/` with the following structure:

```
/public/App Icons/
├── android/
│   ├── mipmap-mdpi/appicons.png (48x48)
│   ├── mipmap-hdpi/appicons.png (72x72)
│   ├── mipmap-xhdpi/appicons.png (96x96)
│   ├── mipmap-xxhdpi/appicons.png (144x144)
│   └── mipmap-xxxhdpi/appicons.png (192x192)
├── appstore.png (1024x1024 for iOS App Store)
├── playstore.png (512x512 for Google Play Store)
└── Assets.xcassets/ (iOS icon assets)
```

## Required Icon Sizes

### PWA Icons (Already configured)
- 48x48, 72x72, 96x96, 144x144, 192x192, 512x512 ✅

### iOS Icons (Need to verify Assets.xcassets)
- 20x20, 29x29, 40x40, 58x58, 60x60, 80x80, 87x87, 120x120, 180x180, 1024x1024

### Android Icons (Already have)
- 48x48 (mdpi), 72x72 (hdpi), 96x96 (xhdpi), 144x144 (xxhdpi), 192x192 (xxxhdpi) ✅

## Splash Screens
Currently you have video splash screens. For PWA/App stores, you'll need static images:

### iOS Splash Screens (Required sizes)
- iPhone SE: 640x1136
- iPhone 8: 750x1334  
- iPhone 8 Plus: 1242x2208
- iPhone X/XS: 1125x2436
- iPhone XR: 828x1792
- iPhone XS Max: 1242x2688
- iPhone 12/13/14: 1170x2532
- iPhone 12/13/14 Pro Max: 1284x2778
- iPad: 1536x2048
- iPad Pro 12.9": 2048x2732

### Android Splash Screens
- ldpi: 240x320
- mdpi: 320x480
- hdpi: 480x800
- xhdpi: 720x1280
- xxhdpi: 960x1600
- xxxhdpi: 1440x2560

## Next Steps
1. Extract a static frame from your splash screen videos
2. Generate iOS splash screens in required sizes
3. Update iOS Assets.xcassets with proper icon sizes
4. Create Android splash screen drawable resources