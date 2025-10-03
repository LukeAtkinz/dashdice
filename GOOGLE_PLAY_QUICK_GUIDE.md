# Google Play Store Submission Quick Guide

## Current Status ✅

### Build Status
- **EAS Build**: In progress (Build ID: 375fe995-45d4-4875-afcd-25ef93e268c7)
- **Platform**: Android App Bundle (AAB)
- **Profile**: Production
- **Signing**: Managed by EAS (Keystore y33BNy4QnE)

### Assets Ready
- **App Icons**: ✅ Available in multiple sizes
- **Package Name**: ✅ com.dashdice.app
- **Version**: ✅ 1.0.0 (versionCode: 1)
- **Store Listing**: ✅ Content prepared

## Next Steps (After Build Completes)

### 1. Download AAB File
```bash
# Build will complete at: https://expo.dev/accounts/dashdice/projects/dashdice/builds/375fe995-45d4-4875-afcd-25ef93e268c7
# Download the .aab file when ready
```

### 2. Create Google Play Console Account
1. Go to https://play.google.com/console
2. Pay $25 registration fee
3. Complete developer profile
4. Verify account

### 3. Create App Listing
1. Click "Create app"
2. Enter app details:
   - **App name**: DashDice - AI Dice Gaming
   - **Default language**: English (United States)
   - **App or game**: Game
   - **Free or paid**: Free

### 4. Complete Store Listing

#### App Details
- **Category**: Games > Puzzle
- **Tags**: Dice Games, AI Gaming, Strategy, Multiplayer
- **Target audience**: Ages 13+

#### Store Listing Content
```
Title: DashDice - AI Dice Gaming

Short description (80 chars):
AI-powered dice gaming with unique modes and real-time multiplayer action!

Full description:
[Use content from GOOGLE_PLAY_STORE_LISTING.md]
```

#### Visual Assets
- **App Icon**: Use playstore.png (512x512)
- **Feature Graphic**: Need to create (1024x500)
- **Screenshots**: Need 2-8 phone screenshots (1080x1920)

### 5. Privacy Policy
- **Host**: Need public URL for privacy policy
- **Content**: Use PRIVACY_POLICY.md
- **Suggested URL**: https://dashdice.com/privacy-policy

### 6. Data Safety
Complete the Data Safety section:

**Data Collection**: Yes
- Account info (email, username)
- Game activity (statistics, preferences)
- Device info (for authentication)

**Data Sharing**: Limited
- Firebase for backend services
- No advertising networks
- No data sales

**Data Security**:
- Encrypted in transit ✅
- Users can delete data ✅
- No sensitive data collection ✅

### 7. Content Rating
Complete questionnaire:
- **Category**: Games
- **Violence**: None
- **Sexual content**: None  
- **Profanity**: None
- **Gambling**: None (no real money)
- **Social features**: Yes (multiplayer)

**Expected Rating**: PEGI 3 / Everyone

### 8. Upload AAB and Submit
1. Go to Production track
2. Upload AAB file
3. Review all sections
4. Submit for review

## Required Assets to Create

### High Priority
1. **Feature Graphic** (1024 x 500)
   - DashDice logo
   - Gameplay elements
   - "AI-Powered Dice Gaming" text

2. **Phone Screenshots** (1080 x 1920) - Need 2-8:
   - Main menu
   - Zero Hour gameplay
   - Last Line tug-of-war
   - Multiplayer match
   - Achievement screen
   - Friends/social
   - Settings/themes
   - Statistics

3. **Privacy Policy URL**
   - Host PRIVACY_POLICY.md publicly
   - Get accessible URL

### Medium Priority
4. **Tablet Screenshots** (optional)
5. **Promotional Video** (optional)

## Quick Screenshot Guide

### Using Browser Developer Tools
1. Open DashDice in Chrome
2. Press F12 for developer tools
3. Click device toolbar icon
4. Set to "Responsive"
5. Set dimensions: 1080 x 1920
6. Navigate to each screen
7. Take screenshots
8. Save as PNG files

### Screenshot Content Suggestions
1. **Main Menu**: Clean UI showing game modes
2. **Zero Hour**: Timer countdown with dice
3. **Last Line**: Tug-of-war rope visualization
4. **Multiplayer**: Real-time match with opponent
5. **Progress**: Achievements and level progression
6. **Social**: Friends list and invitations
7. **Customization**: Themes and personalization
8. **Analytics**: Personal statistics and insights

## Timeline Estimate

### Today (Build in Progress):
- ⏳ EAS build completing (30-60 minutes)
- [ ] Create visual assets (2-3 hours)
- [ ] Host privacy policy (30 minutes)

### Tomorrow:
- [ ] Google Play Console setup (1 hour)
- [ ] Upload AAB and complete listing (1 hour)
- [ ] Submit for review (15 minutes)

### Review Process:
- **Google Play Review**: 1-3 days (typically faster than iOS)
- **App Goes Live**: After approval
- **Monitoring**: Check reviews and crash reports

## Success Tips

### For Faster Approval:
1. **Complete all sections** - No empty fields
2. **High-quality assets** - Professional screenshots
3. **Accurate description** - No misleading claims
4. **Proper content rating** - Age-appropriate
5. **Working privacy policy** - Accessible URL

### Common Rejection Reasons to Avoid:
1. ❌ Missing privacy policy
2. ❌ Low-quality screenshots
3. ❌ Incorrect content rating
4. ❌ Misleading app description
5. ❌ Broken functionality

### DashDice Advantages:
1. ✅ Original concept (AI-powered dice)
2. ✅ Professional development (TypeScript/Next.js)
3. ✅ Complete features (multiplayer, progression)
4. ✅ Proper documentation (privacy policy ready)
5. ✅ Unique gameplay (not a template)

## Monitoring Build Progress

Check build status:
```bash
# Visit: https://expo.dev/accounts/dashdice/projects/dashdice/builds/375fe995-45d4-4875-afcd-25ef93e268c7
# Or run: eas build:list
```

When build completes:
1. Download AAB file
2. Test on Android device/emulator (optional)
3. Proceed with Google Play Console setup

## Backup Plan

If EAS build fails:
```bash
# Alternative: Capacitor build
npm run build:capacitor
npx cap add android
npx cap sync android
npx cap open android
# Build AAB in Android Studio
```

## Contact Support

### Google Play Console Issues:
- **Help Center**: https://support.google.com/googleplay/android-developer/
- **Email**: developer-support@google.com

### EAS Build Issues:
- **Discord**: Expo community Discord
- **Forum**: forums.expo.dev
- **Docs**: docs.expo.dev

Ready for Google Play Store submission! 🚀

The Android app bundle build is in progress and should complete soon. Once it's ready, you can follow this guide to get DashDice live on Google Play Store within 24-48 hours.