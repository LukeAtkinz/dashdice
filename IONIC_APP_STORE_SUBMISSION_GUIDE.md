# 📱 Complete App Store Submission Guide with Ionic/Capacitor

## 🎯 Overview
Your DashDice app is built with Capacitor (from Ionic), so you can use Ionic's streamlined workflow for App Store submission.

## 🛠️ Setup Required Tools

### 1. Install Ionic CLI (Enhanced Capacitor workflow)
```bash
npm install -g @ionic/cli
```

### 2. For iOS Submission (Mac Required)
- **Xcode 15+**: Download from Mac App Store
- **Apple Developer Account**: $99/year at https://developer.apple.com
- **iOS Device/Simulator**: For testing

### 3. For Android Submission
- **Android Studio**: Download from https://developer.android.com/studio
- **Google Play Console Account**: $25 one-time at https://play.google.com/console
- **Android Device/Emulator**: For testing

## 📱 iOS App Store Submission Process

### Step 1: Configure iOS App
```bash
# Open iOS project in Xcode
npx cap open ios

# Or using Ionic CLI
ionic cap open ios
```

### Step 2: App Configuration in Xcode
1. **Bundle Identifier**: `com.dashdice.app` ✅ (already set)
2. **App Name**: `DashDice` ✅ (already set)
3. **Version**: Set to `1.0.0`
4. **Build Number**: Set to `1`
5. **Deployment Target**: iOS 13.0 or higher
6. **Team**: Select your Apple Developer Team

### Step 3: App Icons and Launch Screen
```bash
# Generate all required icon sizes automatically
ionic capacitor resources ios --icon-only

# Or manually add icons to:
# ios/App/App/Assets.xcassets/AppIcon.appiconset/
```

**Required iOS Icon Sizes:**
- 1024×1024 (App Store)
- 180×180 (iPhone)
- 167×167 (iPad Pro)
- 152×152 (iPad)
- 120×120 (iPhone)
- 87×87 (iPhone Settings)
- 80×80 (iPad Settings)
- 76×76 (iPad)
- 60×60 (iPhone Settings)
- 58×58 (iPhone Settings)
- 40×40 (iPad Settings)
- 29×29 (Settings)
- 20×20 (iPad Notifications)

### Step 4: Build for App Store
1. **In Xcode**:
   - Select "Any iOS Device" as target
   - Product → Archive
   - Wait for archive to complete
   - Click "Distribute App"
   - Choose "App Store Connect"
   - Upload to Apple

2. **Or using Ionic CLI** (requires additional setup):
```bash
# Build release version
ionic capacitor build ios --prod

# Sign and upload (requires certificates)
ionic capacitor run ios --device --prod
```

### Step 5: App Store Connect Setup
1. Go to https://appstoreconnect.apple.com
2. Create new app:
   - **Platform**: iOS
   - **Name**: DashDice
   - **Primary Language**: English
   - **Bundle ID**: com.dashdice.app
   - **SKU**: dashdice-ios-2024

3. **App Information**:
   - **Category**: Games
   - **Age Rating**: 4+ (Everyone)
   - **Price**: Free (with optional in-app purchases)

4. **App Privacy**:
   - Create privacy policy (required)
   - Data collection practices
   - Third-party analytics (if using Firebase Analytics)

5. **App Review Information**:
   - Demo account (if login required)
   - Review notes
   - Contact information

6. **Version Information**:
   - **What's New**: "Experience the ultimate dice game with real-time multiplayer, achievements, and ranked competitions!"
   - **Description**: 
     ```
     DashDice is the ultimate multiplayer dice gaming experience! Challenge friends 
     and players worldwide in fast-paced, strategic dice battles.

     🎮 FEATURES:
     • Real-time multiplayer matches
     • Advanced matchmaking system
     • Friends and social features
     • Achievement system with rewards
     • Ranked competitive play
     • Beautiful, intuitive interface
     • Cross-platform compatibility

     🏆 GAME MODES:
     • Quick Match - Jump into instant action
     • Ranked Play - Compete for glory
     • Friend Matches - Challenge your friends
     • Tournament Mode - Ultimate competition

     Whether you're a casual player or competitive gamer, DashDice offers 
     endless entertainment with skill-based gameplay and social features.

     Download now and roll your way to victory!
     ```

7. **Screenshots** (Required):
   - **iPhone 6.7"**: 3-10 screenshots (1290×2796)
   - **iPhone 5.5"**: 3-10 screenshots (1242×2208)
   - **iPad Pro**: 3-10 screenshots (2048×2732)

## 🤖 Google Play Store Submission Process

### Step 1: Configure Android App
```bash
# Open Android project
npx cap open android

# Or using Ionic CLI
ionic cap open android
```

### Step 2: App Configuration in Android Studio
1. **Application ID**: `com.dashdice.app` ✅ (already set)
2. **Version Name**: `1.0.0`
3. **Version Code**: `1`
4. **Target SDK**: 34 (Android 14)
5. **Min SDK**: 24 (Android 7.0)

### Step 3: Generate App Icons
```bash
# Generate all Android icon sizes
ionic capacitor resources android --icon-only

# Icons will be placed in:
# android/app/src/main/res/mipmap-*/
```

### Step 4: Build Release APK/AAB
```bash
# Build release version
ionic capacitor build android --prod

# In Android Studio:
# Build → Generate Signed Bundle/APK
# Choose "Android App Bundle" (recommended)
# Create/use signing key
# Build release AAB
```

### Step 5: Google Play Console Setup
1. Go to https://play.google.com/console
2. Create new app:
   - **App name**: DashDice
   - **Default language**: English
   - **App or game**: Game
   - **Free or paid**: Free

3. **App content**:
   - **Content rating**: Everyone
   - **Target audience**: Ages 13+
   - **Data safety**: Complete data handling questionnaire
   - **Government apps**: No

4. **Store listing**:
   - **Short description**: "Ultimate multiplayer dice game with real-time battles!"
   - **Full description**:
     ```
     🎲 DashDice - The Ultimate Multiplayer Dice Gaming Experience! 🎲

     Challenge friends and players worldwide in this fast-paced, strategic 
     dice game that combines skill, luck, and competitive spirit!

     🎮 KEY FEATURES:
     ★ Real-time multiplayer matches
     ★ Advanced matchmaking system
     ★ Friends and social features
     ★ Achievement system with rewards
     ★ Ranked competitive play
     ★ Beautiful, intuitive interface
     ★ Cross-platform compatibility

     🏆 EXCITING GAME MODES:
     • Quick Match - Jump into instant action
     • Ranked Play - Climb the leaderboards
     • Friend Matches - Challenge your friends
     • Tournament Mode - Ultimate competition

     🌟 WHY CHOOSE DASHDICE:
     • Skill-based gameplay with strategic depth
     • Fair matchmaking for balanced competition
     • Regular updates with new features
     • Active community of dice game enthusiasts
     • Smooth, lag-free gaming experience

     Whether you're looking for casual fun or competitive gaming, 
     DashDice delivers endless entertainment with its innovative 
     gameplay mechanics and social features.

     Download now and roll your way to victory! 🏆
     ```

5. **Graphics** (Required):
   - **App icon**: 512×512 PNG
   - **Feature graphic**: 1024×500 PNG
   - **Phone screenshots**: 2-8 images
   - **7" tablet screenshots**: 1-8 images (optional)
   - **10" tablet screenshots**: 1-8 images (optional)

## 🎨 Creating App Store Assets

### Quick Asset Generation Commands

#### App Icons:
```bash
# Install icon generator tool
npm install -g cordova-res

# Generate all platform icons from a single 1024x1024 source
cordova-res ios --skip-config --copy
cordova-res android --skip-config --copy
```

#### Screenshots:
```bash
# Test your app and take screenshots
ionic capacitor run ios --livereload
ionic capacitor run android --livereload

# Or use simulators/emulators for consistent screenshots
```

## 🚀 Automated Deployment with Ionic

### Using Ionic Appflow (Optional)
```bash
# Link to Ionic Appflow for automated builds
ionic link

# Configure automated deployments
ionic deploy configure

# Trigger automated builds for both platforms
ionic deploy build
```

### Manual Build Scripts
Create these scripts for easier deployment:

#### `scripts/build-ios.sh`:
```bash
#!/bin/bash
ionic capacitor build ios --prod
ionic capacitor sync ios
echo "iOS build ready! Open ios/App.xcworkspace in Xcode"
```

#### `scripts/build-android.sh`:
```bash
#!/bin/bash
ionic capacitor build android --prod
ionic capacitor sync android
echo "Android build ready! Open android/ in Android Studio"
```

## 📋 Pre-Submission Checklist

### iOS App Store:
- [ ] Apple Developer Account active ($99/year)
- [ ] App icons (all required sizes)
- [ ] Screenshots (iPhone 6.7", 5.5", iPad Pro)
- [ ] App description and keywords
- [ ] Privacy policy URL
- [ ] App Store Connect listing complete
- [ ] Binary uploaded and approved
- [ ] Age rating questionnaire completed
- [ ] In-app purchase setup (if applicable)

### Google Play Store:
- [ ] Google Play Console account ($25 one-time)
- [ ] App icons (512×512 + generated sizes)
- [ ] Screenshots (phone + tablet)
- [ ] Feature graphic (1024×500)
- [ ] Store listing complete
- [ ] Content rating completed
- [ ] Data safety form completed
- [ ] Release APK/AAB uploaded
- [ ] App signing configured

## ⏱️ Timeline Expectations

### iOS App Store:
- **Review time**: 1-7 days (typically 24-48 hours)
- **Approval to live**: Immediate after approval
- **Updates**: Same review process

### Google Play Store:
- **Review time**: 1-3 days for new apps
- **Approval to live**: 1-3 hours after approval
- **Updates**: Faster review for existing apps

## 🎉 Success! Your Apps Are Ready

Once submitted, your DashDice mobile game will be available to millions of users worldwide through both major app stores!

**Next steps after submission:**
1. Monitor review status in respective consoles
2. Respond to any reviewer feedback quickly
3. Promote your app once live
4. Plan future updates and features
5. Monitor user feedback and ratings

**Congratulations - you're about to join the ranks of published mobile game developers!** 🚀📱🎮
