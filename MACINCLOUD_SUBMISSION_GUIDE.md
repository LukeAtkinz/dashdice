# MacinCloud iOS App Store Submission Guide

## 🍎 Complete Setup Guide for DashDice iOS Submission

### **Pre-Setup (Do on Windows)**

#### 1. **Generate App Icons** 
Visit: https://appicon.co/
- Upload: `public/App Icons/appstore.png`
- Download: iOS icon pack
- Save to: `Desktop/DashDice_Icons/`

#### 2. **Required Icon Sizes for iOS:**
- **20x20**: @2x (40x40), @3x (60x60)
- **29x29**: @2x (58x58), @3x (87x87)  
- **40x40**: @2x (80x80), @3x (120x120)
- **60x60**: @2x (120x120), @3x (180x180)
- **1024x1024**: App Store icon

---

## 🖥️ **MacinCloud Session Steps**

### **Session 1: Environment Setup (15 minutes)**

#### **1. Connect to MacinCloud:**
- Use Remote Desktop app
- Login with your MacinCloud credentials
- You'll see macOS desktop

#### **2. Install Required Tools:**
```bash
# Open Terminal on Mac
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install node git
npm install -g @capacitor/cli
```

#### **3. Clone Your Project:**
```bash
cd Desktop
git clone https://github.com/LukeAtkinz/dashdice.git
cd dashdice
npm install --legacy-peer-deps
```

#### **4. Open in Xcode:**
```bash
npx cap open ios
```

### **Session 2: App Configuration (10 minutes)**

#### **1. Add App Icons in Xcode:**
- **Assets.xcassets → AppIcon**
- Drag your generated icons to correct slots
- Ensure 1024x1024 icon is in App Store slot

#### **2. Configure App Settings:**
**General Tab:**
- **Display Name:** DashDice
- **Bundle Identifier:** com.dashdice.app
- **Version:** 1.0.0
- **Build:** 1

#### **3. Set Up Signing:**
**Signing & Capabilities:**
- **Team:** Select your Apple Developer Account
- **Automatically manage signing:** ✅ Enable
- **Bundle Identifier:** com.dashdice.app

### **Session 3: Testing & Submission (15 minutes)**

#### **1. Test the App:**
- Select iPhone 15 Pro simulator
- Run app (⌘+R)
- Verify it loads your live website
- Test key functionality

#### **2. Archive for App Store:**
```
1. Product → Archive (wait for build)
2. Organizer window opens
3. "Distribute App"
4. "App Store Connect"
5. Follow prompts to upload
```

#### **3. Troubleshooting:**
- **Build errors:** Check signing certificates
- **Network issues:** Verify production URL works
- **Icon issues:** Ensure all sizes present

---

## 📱 **App Store Connect Setup (Can do from Windows)**

### **While Archive Uploads:**

**Go to:** https://appstoreconnect.apple.com

#### **1. Create App Listing:**
- **Name:** DashDice
- **Bundle ID:** com.dashdice.app
- **Category:** Games
- **Age Rating:** Complete questionnaire

#### **2. App Information:**
```
Title: DashDice - Multiplayer Dice Game
Subtitle: Roll, Strategy, Win Together

Description:
Experience the ultimate dice gaming platform with DashDice! Challenge friends in multiplayer matches, unlock achievements, and master multiple game modes in this engaging strategy game.

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

#### **3. Upload Screenshots:**
- Upload your prepared screenshots
- iPhone 6.7" (1290×2796) required
- iPhone 6.5" (1242×2688) recommended

#### **4. Pricing & Availability:**
- **Price:** Free
- **Availability:** All territories

#### **5. App Review Information:**
- **Contact:** Your email
- **Review Notes:** "Multiplayer dice game with Firebase backend"
- **Privacy Policy:** Upload your PRIVACY_POLICY.md content

---

## ✅ **Pre-Flight Checklist**

### **Before MacinCloud Session:**
- [ ] MacinCloud account active
- [ ] Apple Developer Account ready
- [ ] All app icons generated (appicon.co)
- [ ] Screenshots prepared
- [ ] Privacy policy content ready
- [ ] Project pushed to GitHub
- [ ] Production URL working: https://dashdice-1dib-lmwq4amif-dash-dice.vercel.app

### **During MacinCloud Session:**
- [ ] Node.js and tools installed
- [ ] Project cloned and dependencies installed
- [ ] Xcode project opens successfully
- [ ] All app icons added to Xcode
- [ ] Signing configured with Apple Developer team
- [ ] App runs in simulator successfully
- [ ] Archive created successfully
- [ ] Upload to App Store Connect completed

### **After MacinCloud Session:**
- [ ] App Store Connect listing complete
- [ ] Screenshots uploaded
- [ ] App submitted for review
- [ ] Review submitted

---

## 🎯 **Expected Timeline**

- **MacinCloud Setup:** 15 minutes
- **App Configuration:** 10 minutes  
- **Archive & Upload:** 15 minutes
- **App Store Connect:** 30 minutes
- **Total:** ~1 hour

## 📞 **Support Resources**

- **MacinCloud Support:** Live chat available
- **Apple Developer Support:** https://developer.apple.com/support/
- **App Store Review Guidelines:** https://developer.apple.com/app-store/review/guidelines/

---

## 🚨 **Common Issues & Solutions**

### **"No iOS Development Certificate"**
- Go to Xcode → Preferences → Accounts
- Add your Apple ID
- Download certificates

### **"Bundle Identifier Not Available"**
- Verify in Apple Developer portal
- Ensure it matches exactly: com.dashdice.app

### **"Archive Failed"**
- Check all icons are present
- Verify signing settings
- Try "Clean Build Folder" (⌘+Shift+K)

### **"Upload Failed"**
- Check internet connection
- Verify Apple Developer account is active
- Try uploading smaller build

---

**🎉 Your DashDice app is ready for the App Store! The MacinCloud session should take about 1 hour total to complete the entire submission process.**