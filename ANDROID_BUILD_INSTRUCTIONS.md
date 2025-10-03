# Android Build Instructions for DashDice

## Current Status
✅ Next.js build completed successfully  
✅ Capacitor Android platform added  
✅ Web assets synced to Android project  
✅ Android project structure created  

## Build Options

### Option 1: Command Line Build (Quick)
```bash
# Navigate to android directory and build
cd android
./gradlew assembleRelease
# This creates an APK at: android/app/build/outputs/apk/release/app-release-unsigned.apk
```

### Option 2: Android App Bundle (Preferred for Google Play)
```bash
# Build AAB instead of APK
cd android
./gradlew bundleRelease
# This creates an AAB at: android/app/build/outputs/bundle/release/app-release.aab
```

### Option 3: Android Studio (If command line fails)
```bash
# Open project in Android Studio
npx cap open android
# Then build from Android Studio: Build > Generate Signed Bundle/APK
```

## Signing Configuration

### For Release Build, you need:
1. **Keystore file** - for signing the app
2. **Keystore password** 
3. **Key alias**
4. **Key password**

### Quick Development Signing (for testing)
Android will auto-generate a debug keystore for development builds.

### Production Signing (for Google Play)
You'll need to create a proper keystore:
```bash
keytool -genkey -v -keystore dashdice-release-key.keystore -alias dashdice -keyalg RSA -keysize 2048 -validity 10000
```

## Next Steps

1. **Try building** with gradlew commands above
2. **If successful**: You'll have APK/AAB ready for Google Play
3. **If build fails**: We'll troubleshoot the specific error
4. **For production**: Create proper signing keystore

## Alternative: Use Google Play Console App Bundle Upload
Google Play Console can also optimize your APK if you upload a regular APK instead of AAB.

Let's try the build commands now!