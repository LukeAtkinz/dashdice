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

**🖥️ What You'll See:**
- macOS desktop with dock at bottom
- Finder icon, Safari, Terminal app
- Similar to Windows but with different styling
- Apple menu in top-left corner

**⚠️ MacinCloud Permission Issues:**
If you encounter "Need sudo access" errors:
1. **Contact MacinCloud Support** - Ask for administrator access
2. **Check your plan** - Some basic plans don't include admin rights
3. **Use workarounds** - See alternative installation methods below

#### **2. Install Required Tools:**

**🔧 Step-by-Step Terminal Commands:**

**First, open Terminal on Mac:**
- Press `⌘ + Space` (Spotlight search)
- Type "Terminal" and press Enter
- You'll see a black window with a cursor

**Install Homebrew (Mac package manager):**

⚠️ **If you get "Need sudo access" error, try these alternatives:**

**Option 1: Install Homebrew without sudo (Recommended):**
```bash
# Install Homebrew to your home directory (no sudo needed):
git clone https://github.com/Homebrew/brew ~/.homebrew
echo 'export PATH="$HOME/.homebrew/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

**Option 2: Use pre-installed tools:**
```bash
# Check if Node.js is already installed:
which node
node --version

# If Node.js is already available, skip Homebrew and go directly to:
npm install -g @capacitor/cli
```

**Option 3: Contact MacinCloud Support:**
```bash
# If neither works, contact MacinCloud support and ask for:
# "Administrator access to install development tools"
# Most development plans include this
```

**Original method (if you have sudo access):**
```bash
# Copy and paste this ENTIRE line into Terminal:
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```
**What you'll see:**
- Terminal will download and install Homebrew (2-3 minutes)
- You'll see lots of text scrolling
- It may ask for your Mac password - type it (you won't see dots)
- Press Enter when prompted

**Install Node.js and Git:**

**🔍 First, check what's already installed:**
```bash
# Check if Node.js is pre-installed:
which node
node --version

# Check if Git is pre-installed:
which git
git --version
```

**If tools are already installed, skip to Capacitor install. Otherwise:**

**Option 1: Using Homebrew (if installed successfully):**
```bash
# After Homebrew finishes, run:
~/.homebrew/bin/brew install node git
```

**Option 2: Download directly (no sudo needed):**
```bash
# Download Node.js manually:
curl -o node.tar.gz https://nodejs.org/dist/v18.17.0/node-v18.17.0-darwin-x64.tar.gz
tar -xzf node.tar.gz
export PATH="$PWD/node-v18.17.0-darwin-x64/bin:$PATH"
echo 'export PATH="$HOME/node-v18.17.0-darwin-x64/bin:$PATH"' >> ~/.zshrc
```

**Option 3: Use MacinCloud pre-installed tools:**
```bash
# Many MacinCloud instances have development tools pre-installed
# Try these paths:
/usr/local/bin/node --version
/usr/bin/git --version
```
**What you'll see:**
- "Installing node..." and "Installing git..." messages
- Takes about 2-3 minutes
- Ends with "✅ node was successfully installed!"

**Install Capacitor CLI:**

⚠️ **If you get "EACCES: permission denied" error, use local installation:**

**Option 1: Install Capacitor locally (Recommended for MacinCloud):**
```bash
# Skip global install, we'll use npx instead
# This avoids permission issues completely
echo "✅ Node.js is ready, we'll use npx for Capacitor"
```

**Option 2: If you want global install (requires admin):**
```bash
# Finally, install Capacitor:
npm install -g @capacitor/cli
```

**What you'll see:**
- Downloads and installs Capacitor tools
- Takes about 30 seconds
- Shows version number when complete

**Note:** We can use `npx @capacitor/cli` instead of global install!

#### **3. Clone Your Project:**

**🗂️ Step-by-Step Project Setup:**

**Navigate to Desktop:**
```bash
# Go to Desktop folder:
cd Desktop
```
**What happens:** Your terminal prompt changes to show `~/Desktop`

**Clone your DashDice project:**
```bash
# Download your project from GitHub:
git clone https://github.com/LukeAtkinz/dashdice.git
```
**What you'll see:**
- "Cloning into 'dashdice'..." message
- Progress: "Receiving objects: 100%"
- Takes about 10-15 seconds
- Creates a "dashdice" folder on Desktop

**Enter the project folder:**
```bash
# Go into your project:
cd dashdice
```
**What happens:** Your prompt changes to `~/Desktop/dashdice`

**Install project dependencies:**
```bash
# Install all the packages your app needs:
npm install --legacy-peer-deps
```
**What you'll see:**
- "Installing dependencies..." message
- Lots of package names scrolling by
- Progress bars for downloads
- Takes 2-3 minutes
- Ends with "added 2000+ packages"
- **Important:** This should work now because of our .npmrc fix!

#### **4. Open in Xcode:**

**🍎 Launch Xcode with Your Project:**

**Open your iOS project in Xcode:**
```bash
# Use npx to run Capacitor without global install:
npx @capacitor/cli open ios
```

**Alternative if above doesn't work:**
```bash
# If npx @capacitor/cli doesn't work, try:
cd ios/App
open App.xcworkspace
```

**🚨 If Xcode Opens but Shows No Project Files:**

This is a common issue! The problem is that the Capacitor iOS project needs to be properly synced first.

**Solution - Run these commands in Terminal:**
```bash
# First, make sure you're in the main project directory:
cd ~/Desktop/dashdice

# Sync the Capacitor project (this copies your web app to iOS):
npx @capacitor/cli sync ios

# Now open the iOS project:
npx @capacitor/cli open ios
```

**Manual Alternative:**
```bash
# If the above doesn't work, do it step by step:
cd ~/Desktop/dashdice

# Build your web app first:
npm run build

# Then sync to iOS:
npx @capacitor/cli sync ios

# Finally open in Xcode:
cd ios/App
open App.xcworkspace
```

**What `npx cap sync ios` does:**
- Copies your built web app to the iOS project
- Updates iOS project configuration
- Ensures all plugins are properly linked
- Creates the proper project structure for Xcode

**What you'll see:**
- Terminal shows "Opening Xcode workspace..."
- Xcode application launches (big blue icon)
- Takes 10-15 seconds to load
- Xcode opens with your DashDice project loaded
- You'll see file navigator on left side
- Main area shows your iOS project structure

**Visual Confirmation:**
- ✅ **Xcode window title**: "App.xcworkspace"
- ✅ **Left sidebar**: Shows "App" project with folders
- ✅ **File navigator**: Contains your iOS app files
- ✅ **No errors**: Blue "Run" button should be visible

**🎯 At This Point:**
- Your DashDice project is fully loaded in Xcode
- All dependencies are installed
- Ready to add app icons and configure signing
- Ready to test in iOS Simulator

**Next you'll:**
1. **Add your app icons** (drag from Desktop folder)
2. **Configure Apple Developer signing**
3. **Test in iPhone simulator**
4. **Archive and submit to App Store**

---

## 🚨 **Common Setup Issues & Quick Fixes**

### **If Homebrew Install Fails:**
```bash
# If you get permission errors, try:
sudo /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
# Enter your Mac password when prompted
```

### **If `npm install` Shows Errors:**
```bash
# Clear npm cache and try again:
npm cache clean --force
npm install --legacy-peer-deps --force
```

### **If Xcode Doesn't Open:**
```bash
# Check if Capacitor installed correctly:
npx cap --version
# Should show version number

# Try opening manually:
open ios/App/App.xcworkspace
```

### **If Git Clone Fails:**
```bash
# Make sure you're connected to internet
# Try with HTTPS instead:
git clone https://github.com/LukeAtkinz/dashdice.git

# If still fails, download ZIP:
# Go to GitHub in browser → Code → Download ZIP
```

---

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

### **Detailed Timing Breakdown:**

**Environment Setup:** 15 minutes total
- Opening Terminal: 30 seconds
- Installing Homebrew: 3-4 minutes
- Installing Node/Git: 2-3 minutes
- Installing Capacitor: 30 seconds
- Cloning project: 15 seconds
- Installing dependencies: 3-4 minutes
- Opening Xcode: 30 seconds

**App Configuration:** 10 minutes total
- Adding app icons: 3-4 minutes
- Configuring signing: 2-3 minutes
- Setting app details: 2-3 minutes

**Archive & Upload:** 15 minutes total
- Testing in simulator: 3-4 minutes
- Creating archive: 5-7 minutes
- Uploading to App Store: 5-7 minutes

**App Store Connect:** 30 minutes total
- Creating app listing: 10 minutes
- Adding screenshots: 5 minutes
- Writing description: 10 minutes
- Submitting for review: 5 minutes

**Total Time:** ~1 hour and 10 minutes

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