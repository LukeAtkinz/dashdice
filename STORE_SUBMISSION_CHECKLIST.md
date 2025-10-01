# 📱 DashDice - App Store Submission Checklist

## 🚀 Pre-Submission Setup

### 1. Expo/EAS Account Setup
- [ ] Create Expo account at https://expo.dev
- [ ] Install EAS CLI: `npm install -g @expo/cli`
- [ ] Login: `npx expo login`
- [ ] Update `app.json` with your Expo username in `owner` field
- [ ] Get your project ID: `npx expo whoami` and update `extra.eas.projectId`

### 2. Apple Developer Account (iOS)
- [ ] Enroll in Apple Developer Program ($99/year)
- [ ] Create App Store Connect app record
- [ ] Generate iOS Distribution Certificate
- [ ] Create App Store Provisioning Profile
- [ ] Update `eas.json` with Apple ID and Team ID

### 3. Google Play Console (Android)
- [ ] Create Google Play Console account ($25 one-time fee)
- [ ] Create new app in Play Console
- [ ] Generate Upload Key for signing
- [ ] Create Service Account for automated uploads
- [ ] Download service account JSON key

## 📋 Required Assets & Content

### 🎨 App Icons & Graphics
- [x] Android adaptive icon (foreground + background)
- [x] iOS app icon (1024x1024)
- [x] Google Play Store icon (512x512)
- [ ] App Store screenshots (per device size)
- [ ] Google Play Store screenshots (per device size)
- [ ] Feature graphic for Google Play (1024x500)
- [ ] App preview video (optional but recommended)

### 📝 Store Metadata
**App Names:**
- [x] App Title: \"Dashdice\" (✅ 30 chars)
- [x] iOS Subtitle: \"Who will take the crown?\" (✅ 30 chars)

**Descriptions:**
- [x] Google Play Short: \"Who will take the crown? Play PvP dice battles, earn founder rewards, and compete!\" (✅ 80 chars)
- [x] Full Description: Ready (✅ 4000 chars) - See provided content
- [ ] iOS Keywords: Need to create (100 chars, comma-separated)

**Store Listings:**
- [ ] Privacy Policy URL (REQUIRED)
- [ ] Terms of Service URL (recommended)
- [ ] Support URL/Email
- [ ] Marketing URL (optional)

### 📱 Screenshots Required

#### iOS Screenshots (Per Device)
- [ ] iPhone 6.7\" (iPhone 14 Pro Max): 1290x2796
- [ ] iPhone 6.5\" (iPhone 14 Plus): 1284x2778  
- [ ] iPhone 5.5\" (iPhone 8 Plus): 1242x2208
- [ ] iPad Pro 12.9\" (6th gen): 2048x2732
- [ ] iPad Pro 12.9\" (2nd gen): 2048x2732

#### Android Screenshots  
- [ ] Phone screenshots: 1080x1920 (min)
- [ ] 7-inch tablet: 1200x1920 (optional)
- [ ] 10-inch tablet: 1920x1200 (optional)

## 🔧 Technical Requirements

### iOS Compliance
- [ ] App Store Review Guidelines compliance
- [ ] Privacy manifest (iOS 17+)
- [ ] App Tracking Transparency (if using tracking)
- [ ] iOS 13.4+ deployment target
- [ ] 64-bit support
- [ ] No private APIs usage

### Android Compliance  
- [ ] Target API level 34 (Android 14)
- [ ] 64-bit support (arm64-v8a)
- [ ] App Bundle (.aab) format
- [ ] Data Safety section completion
- [ ] Permissions justification

### Privacy & Legal
- [ ] Privacy Policy (link in both stores)
- [ ] GDPR compliance (EU users)
- [ ] COPPA compliance (under 13 users)
- [ ] California Consumer Privacy Act (CCPA)
- [ ] Data collection disclosure
- [ ] Third-party SDK privacy info

## 🛠️ Build Commands

### Testing Builds
```bash
# Test PWA locally
npm run expo:start:web

# Test on devices
npx expo start --tunnel
```

### Production Builds
```bash
# Android App Bundle (.aab)
npm run expo:build:android

# iOS App Store build (.ipa)  
npm run expo:build:ios

# Both platforms
npm run expo:build:all
```

### Submission Commands
```bash
# Submit to Google Play
npm run expo:submit:android

# Submit to App Store
npm run expo:submit:ios
```

## 📊 Store-Specific Checklists

### 🤖 Google Play Store
- [ ] Create app in Play Console
- [ ] Complete App content rating questionnaire
- [ ] Set up Data safety section
- [ ] Upload signed AAB file
- [ ] Add store listing assets
- [ ] Set pricing & distribution
- [ ] Choose release track (Internal → Alpha → Beta → Production)
- [ ] Submit for review

**Data Safety Items to Declare:**
- [ ] Personal info collected (email, name if applicable)
- [ ] Device info (for analytics)
- [ ] App activity (gameplay data)
- [ ] Third-party data sharing (Firebase, analytics)

### 🍎 App Store Connect  
- [ ] Create app record in App Store Connect
- [ ] Upload app binary via Xcode or Transporter
- [ ] Complete App Information section
- [ ] Add screenshots and app preview
- [ ] Set pricing and availability
- [ ] Complete export compliance info
- [ ] Submit for App Review

**Export Compliance:**
- [ ] Declare encryption usage (usually \"No\" for games)
- [ ] ECCN classification if applicable

## 🔍 Testing & Quality Assurance

### Pre-Launch Testing
- [ ] Test app installation from stores (internal tracks)
- [ ] Verify deep links work
- [ ] Test push notifications
- [ ] Check offline functionality
- [ ] Test on various devices/screen sizes
- [ ] Performance testing (loading times, memory usage)
- [ ] Accessibility testing (VoiceOver, TalkBack)

### App Store Optimization (ASO)
- [ ] Keyword research for app store search
- [ ] A/B testing of screenshots
- [ ] Competitive analysis of similar apps
- [ ] Localization for target markets

## 📈 Post-Launch

### Analytics & Monitoring
- [ ] Set up app analytics (Firebase, App Store Connect Analytics)
- [ ] Monitor crash reports  
- [ ] Track user acquisition sources
- [ ] Monitor app store reviews & ratings
- [ ] Set up automated alerts for issues

### Updates & Maintenance
- [ ] Plan regular update schedule
- [ ] Monitor OS updates for compatibility
- [ ] Track app store policy changes
- [ ] Plan feature roadmap for user retention

## ⚠️ Common Rejection Reasons to Avoid

### iOS Rejections
- Missing privacy policy
- Inappropriate content rating
- Broken links in metadata
- App crashes on launch
- Missing required device support
- Privacy violations

### Android Rejections  
- Incorrect target API level
- Missing required permissions explanations
- Inappropriate content rating
- Broken core functionality
- Privacy policy violations
- Malware detection

## 📞 Support & Resources

### Documentation
- [Expo Application Services (EAS)](https://docs.expo.dev/eas/)
- [App Store Connect Help](https://developer.apple.com/app-store-connect/)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer/)

### Testing Tools
- [App Store Connect TestFlight](https://developer.apple.com/testflight/)
- [Google Play Internal Testing](https://support.google.com/googleplay/android-developer/answer/3131213)

---

## ✅ Quick Start Commands

1. **Setup Expo account and login**
   ```bash
   npx expo login
   npx expo whoami
   ```

2. **Build for stores**
   ```bash
   npm run expo:build:all
   ```

3. **Submit to stores** (after builds complete)
   ```bash
   npm run expo:submit:android
   npm run expo:submit:ios
   ```

4. **Test PWA locally**
   ```bash
   npm run expo:start:web
   ```

Remember: Both stores typically take 1-7 days for review. Plan accordingly for your launch timeline!