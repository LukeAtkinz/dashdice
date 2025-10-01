# DashDice iOS App Store Submission Guide

## 🎯 **Immediate Actions in Xcode**

### **1. Configure App Identity & Signing**

#### **In Xcode (currently open):**
1. **Select "App" project** (top of file navigator)
2. **Select "App" target** (under TARGETS)
3. **Go to "General" tab**

#### **App Information:**
- ✅ **Display Name**: "DashDice" (already set)
- ✅ **Bundle Identifier**: "com.dashdice.app" (already set)
- ⚠️ **Version**: Set to "1.0.0"
- ⚠️ **Build**: Set to "1"

#### **Signing & Capabilities:**
- **Team**: Select your Apple Developer Account
- **Automatically manage signing**: ✅ Enable
- **Bundle Identifier**: Should already be `com.dashdice.app`

### **2. Add App Icons (Critical)**

**You already have app icons at:**
- `public/App Icons/appstore.png` (1024x1024)
- `public/App Icons/playstore.png`

**In Xcode:**
1. **Assets.xcassets → AppIcon**
2. **Drag your `appstore.png`** to the 1024x1024 slot
3. **You need additional sizes**:
   - 40x40px (2x = 80x80)
   - 60x60px (2x = 120x120, 3x = 180x180)
   - 20x20px (2x = 40x40, 3x = 60x60)
   - 29x29px (2x = 58x58, 3x = 87x87)

**Quick Solution**: Use an online icon generator like:
- https://appicon.co/
- Upload your 1024x1024 `appstore.png`
- Download all iOS sizes
- Drag them into Xcode AppIcon slots

### **3. Configure Launch Screen**

**In Xcode:**
1. **LaunchScreen.storyboard** (or create one)
2. **Add your logo/branding**
3. **Set background color to match your app theme**

### **4. Test in Simulator**

**In Xcode:**
1. **Select iPhone device** (iPhone 15 Pro recommended)
2. **Run the app** (⌘+R)
3. **Test key features**:
   - Login/Register
   - Game modes
   - Navigation
   - Firebase connectivity

## 🚀 **App Store Submission Process**

### **Phase 1: Archive for Distribution**

1. **In Xcode menu**: Product → Archive
2. **Wait for build to complete**
3. **Organizer window opens** → "Distribute App"
4. **Select "App Store Connect"**
5. **Upload to App Store Connect**

### **Phase 2: App Store Connect Setup**

**Go to: https://appstoreconnect.apple.com**

#### **App Information:**
- **Name**: DashDice
- **Category**: Games
- **Age Rating**: Complete questionnaire
- **Privacy Policy**: Use your `PRIVACY_POLICY.md` content

#### **Pricing & Availability:**
- **Price**: Free (recommended for initial launch)
- **Availability**: All countries (or your preference)

#### **App Store Metadata:**
```
Title: DashDice - Multiplayer Dice Game
Subtitle: Roll, Strategy, Win Together
Description: 
Experience the ultimate dice gaming platform with DashDice! 
Challenge friends in multiplayer matches, unlock achievements, 
and master multiple game modes in this engaging strategy game.

Features:
• Real-time multiplayer gameplay
• Multiple dice game modes
• Achievement system with rewards
• Friend connections and chat
• Cross-platform compatibility
• Offline practice mode

Perfect for quick matches or extended gaming sessions!

Keywords: dice, multiplayer, strategy, games, friends, achievement, board game, casual
```

#### **Screenshots (Required):**
**You mentioned you have screenshots ready** ✅

**Upload requirements:**
- **iPhone 6.7"**: 1290×2796 (iPhone 15 Pro Max)
- **iPhone 6.5"**: 1242×2688 (iPhone 11 Pro Max)
- **Need 3-10 screenshots showing**:
  - Main game screen
  - Login/menu
  - Multiplayer match
  - Achievement screen
  - Friends/social features

### **Phase 3: Review Submission**

#### **Before Submitting:**
- ✅ **Privacy Policy uploaded**
- ✅ **Screenshots added**
- ✅ **App description complete**
- ✅ **Age rating set**
- ✅ **App icons in all sizes**
- ✅ **Successful archive upload**

#### **Submit for Review:**
1. **"Submit for Review"** button in App Store Connect
2. **Review timeline**: 1-7 days typically
3. **Apple will test your app**

## ⚠️ **Production Configuration Required**

**Before final submission**, update your app to use production servers:

### **Update Capacitor Config:**
```typescript
// capacitor.config.ts
server: {
  url: 'https://your-production-domain.com' // Replace localhost
}
```

### **Deploy Your App:**
Since you already have Vercel deployment, ensure:
- ✅ **Production domain is live**
- ✅ **Firebase configured for production**
- ✅ **All APIs working in production**

## 📋 **Current Status Checklist**

- [x] ✅ Capacitor iOS project created
- [x] ✅ App running in Xcode
- [x] ✅ Privacy policy created
- [x] ✅ App icons available
- [ ] ⚠️ App icons added to Xcode (sizes 40x40, 60x60, etc.)
- [ ] ⚠️ Signing & team configured
- [ ] ⚠️ Production server URL configured
- [ ] ⚠️ App archived and uploaded
- [ ] ⚠️ App Store Connect metadata complete

## 🎯 **Next Immediate Steps:**

1. **Generate icon sizes** using appicon.co
2. **Add all icons to Xcode**
3. **Configure your Apple Developer team**
4. **Test app thoroughly in simulator**
5. **Archive and upload to App Store Connect**

**Your app is very close to submission! The main blocker is getting all icon sizes into Xcode.** 🚀