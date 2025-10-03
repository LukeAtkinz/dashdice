# Google Play Store Assets Checklist

## Required Assets Status

### ✅ App Information
- [x] App name: DashDice
- [x] Package name: com.dashdice.app
- [x] Version: 1.0.0 (versionCode: 1)
- [x] Category: Games > Puzzle
- [x] Content rating: PEGI 3/Everyone

### ✅ App Bundle
- [x] AAB file building via EAS
- [x] Target API: Android 14 (API 34)
- [x] 64-bit support: Yes
- [x] App signing: EAS managed

### 📝 Store Listing Content
- [x] App title: "DashDice - AI Dice Gaming"
- [x] Short description (80 chars): "AI-powered dice gaming with unique modes and real-time multiplayer action!"
- [x] Full description (4000 chars): Complete with features and benefits
- [x] Keywords: Dice Games, AI Gaming, Strategy, Multiplayer

### 📱 Visual Assets Needed

#### High Priority (Required)
- [ ] **App Icon**: 512 x 512 PNG
  - Current: /public/App Icons/appstore.png (needs verification for 512x512)
  - Background: Solid, not transparent
  
- [ ] **Feature Graphic**: 1024 x 500 PNG/JPEG
  - Purpose: Featured placement and banners
  - Content: DashDice logo with gameplay elements
  
- [ ] **Phone Screenshots**: 2-8 screenshots (1080 x 1920)
  - Screenshot 1: Main menu with game modes
  - Screenshot 2: Zero Hour gameplay with timer
  - Screenshot 3: Last Line tug-of-war mode
  - Screenshot 4: Multiplayer match in progress
  - Screenshot 5: Achievement/progress screen
  - Screenshot 6: Friends and social features
  - Screenshot 7: Customization/themes
  - Screenshot 8: Statistics and analytics

#### Medium Priority (Recommended)
- [ ] **Tablet Screenshots**: 4 screenshots (2048 x 1536)
- [ ] **Promotional Video**: 30-60 seconds
- [ ] **Hi-res Icon**: 512 x 512 PNG (32-bit)

### 📄 Legal/Policy Requirements
- [x] Privacy Policy: Written and ready
- [ ] Privacy Policy URL: Need to host on website
- [x] Data Safety form: Information prepared
- [x] Content rating questionnaire: Ready to complete

### 🏪 Google Play Console Setup
- [ ] Create Google Play Console account ($25 fee)
- [ ] Create app listing
- [ ] Upload AAB file
- [ ] Complete store listing
- [ ] Submit data safety form
- [ ] Complete content rating
- [ ] Submit for review

## Next Steps Priority Order

### Step 1: Complete Visual Assets (Today)
```bash
# Check current app icon size
# Create feature graphic
# Take/create 8 phone screenshots
# Optimize all images for Google Play specs
```

### Step 2: Host Privacy Policy (Today)
```bash
# Create simple landing page with privacy policy
# Or add to existing website
# Get public URL for Google Play Console
```

### Step 3: Google Play Console Setup (Tomorrow)
```bash
# Create account and pay $25 fee
# Create app listing
# Upload all assets
# Complete all forms
```

### Step 4: Upload and Submit (Tomorrow)
```bash
# Upload AAB file (when EAS build completes)
# Final review of store listing
# Submit for Google Play review
```

## Asset Creation Commands

### Check Current Icon Size
```bash
# Check if current icon meets requirements
cd "c:\Users\david\Documents\dashdice\public\App Icons"
# Verify appstore.png is 512x512
```

### Screenshot Strategy
1. **Run the app in browser/emulator**
2. **Capture key screens** at 1080x1920 resolution
3. **Add overlay text** highlighting unique features
4. **Ensure consistent branding** across all screenshots

### Feature Graphic Design
- **Background**: Dark theme matching app
- **Logo**: DashDice branding
- **Elements**: Dice, AI symbols, multiplayer icons
- **Text**: "AI-Powered Dice Gaming" or similar tagline

## Google Play Console Account Setup

### Required Information
- **Developer name**: DashDice or your preferred name
- **Contact email**: Your email address
- **Phone number**: For verification
- **Address**: Business/personal address
- **Payment info**: For the $25 registration fee

### App Listing Setup
- **Default language**: English (United States)
- **App title**: DashDice - AI Dice Gaming
- **Short description**: (80 chars prepared)
- **Full description**: (4000 chars prepared)

## Timeline Estimate

### Day 1 (Today):
- ✅ EAS build started (30-60 minutes)
- [ ] Create visual assets (2-3 hours)
- [ ] Host privacy policy (30 minutes)
- [ ] Prepare Google Play Console account (30 minutes)

### Day 2 (Tomorrow):
- [ ] Complete Google Play Console setup (1 hour)
- [ ] Upload AAB and assets (30 minutes)
- [ ] Complete all forms and questionnaires (30 minutes)
- [ ] Submit for review (5 minutes)

### Day 3-5:
- [ ] Google Play review process (1-3 days typical)
- [ ] App goes live if approved
- [ ] Monitor initial reviews and crash reports

## Backup Plan

If any issues arise with the main plan:

### Alternative Build Method:
```bash
# If EAS build fails, use Capacitor
npm run build:capacitor
npx cap add android
npx cap sync android
npx cap open android
# Build AAB in Android Studio
```

### Alternative Screenshots:
- Use browser developer tools to simulate mobile
- Take screenshots at 1080x1920 resolution
- Use online tools to resize if needed

### Alternative Icon Creation:
- Ensure current icon is 512x512
- Remove transparency if present
- Add solid background if needed

## Success Indicators

### Ready for Submission When:
- [x] AAB file built successfully
- [ ] All visual assets created and optimized
- [ ] Privacy policy publicly accessible
- [ ] Google Play Console account created
- [ ] Store listing content finalized

### Submission Complete When:
- [ ] AAB uploaded to Google Play Console
- [ ] All store listing fields completed
- [ ] Data safety form submitted
- [ ] Content rating completed
- [ ] App submitted for review

### Post-Submission:
- [ ] Monitor Google Play Console for review status
- [ ] Prepare responses for any review feedback
- [ ] Plan launch announcement and marketing
- [ ] Set up analytics and monitoring

## Contact Information for Support

### Google Play Support:
- **Console Help**: https://support.google.com/googleplay/android-developer/
- **Policy Questions**: developer-support@google.com
- **Technical Issues**: Google Play Console help center

### Community Resources:
- **Reddit**: r/androiddev, r/gamedev
- **Stack Overflow**: android-app-bundle, google-play-console
- **Discord**: Various gamedev communities

Ready to proceed with visual asset creation and Google Play Console setup!