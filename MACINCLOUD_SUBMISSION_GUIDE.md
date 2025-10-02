# MacinCloud iOS App Store Submission Guide

## 🍎 Complete Setup Guide for DashDice iOS Submission

### **Pre-Setup (Do on Windows)**

#### 1. **Generate App Icons** 
Visit: https://appicon.co/
- Upload: `public/App Icons/appstore.png`
- Download: iOS icon pack
- Save to: `Desktop/DashDice_Icons/`

#### 2. **Required Icon Sizes for iOS:**

**📱 iPhone Icons (Required):**
- **20x20**: @2x (40x40), @3x (60x60)
- **29x29**: @2x (58x58), @3x (87x87)  
- **40x40**: @2x (80x80), @3x (120x120)
- **60x60**: @2x (120x120), @3x (180x180)
- **1024x1024**: App Store icon

**📱 iPad Icons (CRITICAL - Missing causes upload errors!):**
- **20x20**: @1x (20x20), @2x (40x40)
- **29x29**: @1x (29x29), @2x (58x58)
- **40x40**: @1x (40x40), @2x (80x80)
- **76x76**: @1x (76x76), @2x (152x152) ← **YOU'RE MISSING THIS!**
- **83.5x83.5**: @2x (167x167) ← **YOU'RE MISSING THIS!**

**🚨 CRITICAL:** If you don't include ALL iPad icons, your app upload will FAIL with the exact error you're seeing!

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

## 📱 **How to Change App Name in Xcode**

### **🎯 Two Types of Names You Can Change:**

**1. Display Name** - What users see on their iPhone home screen
**2. Product Name** - Internal bundle name (usually keep same as display name)

---

### **📍 Step-by-Step: Change Display Name**

**🖥️ In Xcode, follow these steps:**

**Step 1: Select Your Project**
```
Left Sidebar → Click "App" (the blue project icon at the top)
```

**Step 2: Select the App Target**
```
In the main area, under "TARGETS" → Click "App"
```

**Step 3: Go to General Tab**
```
Top tabs → Click "General" (should be selected by default)
```

**Step 4: Find Display Name Field**
```
┌─────────────────────────────────────────┐
│ Identity                                │
├─────────────────────────────────────────┤
│ Display Name: [DashDice        ] 📝     │ ← EDIT THIS!
│ Bundle Identifier: com.dashdice.app     │
│ Version: 1.0.0                          │
│ Build: 1                                │
└─────────────────────────────────────────┘
```

**✏️ Click in the "Display Name" field and change it to:**
- `DashDice` (current)
- `Dash Dice` 
- `DashDice Game`
- `DashDice: Multiplayer`
- Or whatever you prefer!

**Visual Guide:**
```
🖥️ Xcode Window Layout:
┌─────────────────────────────────────────────────────────┐
│ [File] [Edit] [View] ...                                │
├─────────────────────────────────────────────────────────┤
│ [📁App]     │ General  Signing  Resource Tags  Info     │
│ ├─App       │                                           │
│ ├─Pods      │ 📱 Identity                              │
│             │ Display Name: [Your New Name Here] 📝     │
│             │ Bundle Identifier: com.dashdice.app       │
│             │ Version: 1.0.0                            │
│             │ Build: 1                                  │
└─────────────────────────────────────────────────────────┘
```

---

### **🎨 Display Name Examples & Guidelines:**

**✅ Good Display Names:**
- `DashDice` (current - short & clean)
- `Dash Dice` (with space)
- `DashDice Game` (descriptive)
- `DashDice: Roll & Win` (with tagline)

**❌ Avoid These:**
- Names longer than 15 characters (get truncated)
- Special characters: `@#$%^&*()`
- All caps: `DASHDICE`
- Emoji in the name (use in description instead)

**📏 Character Limits:**
- **iPhone Home Screen:** ~12 characters before truncation
- **App Store:** 30 characters max
- **Recommendation:** Keep it under 10 characters

---

### **⚙️ Advanced: Change Product Name (Optional)**

**If you also want to change the internal product name:**

**Step 1: Go to Build Settings**
```
Target "App" → Click "Build Settings" tab
```

**Step 2: Search for "Product Name"**
```
Search box: Type "product name" 
```

**Step 3: Edit Product Name**
```
Product Name: [Change from "App" to "DashDice"]
```

**⚠️ Note:** Usually you don't need to change this unless you want the bundle to have a different internal name.

---

### **📱 How to Verify the Change:**

**Method 1: Build and Run**
1. Press `⌘+R` or click the Play button ▶️
2. Wait for simulator to load
3. Look at the app icon on the simulator home screen
4. The name under the icon should show your new display name

**Method 2: Check Info.plist**
1. In left sidebar → Expand "App" → Click "Info.plist"
2. Look for `CFBundleDisplayName` 
3. Should show your new name

**Visual Confirmation:**
```
📱 iPhone Simulator Home Screen:
┌─────────────────┐
│  [🎲]           │  ← Your app icon
│ Your New Name   │  ← This should show your display name
└─────────────────┘
```

---

**General Tab Configuration:**
- **Display Name:** [Your Choice - e.g., "DashDice"]
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

## 🏗️ **Step-by-Step Archive Process with Visual Guide**

### **BEFORE Starting - Make Sure App Runs:**
```bash
# In Xcode, first test the app:
# Press ⌘+R or click the Play button ▶️
# Wait for "DashDice loading..." screen to appear in simulator
# Once confirmed working, stop the simulator
```

---

### **Step 1: Change Target Device (CRITICAL!)**

**🖥️ Look at the TOP-LEFT of Xcode window:**
```
┌─────────────────────────────────────────────────────────┐
│ ▶️ [App >] [iPhone 15 Pro Simulator ▼] [   Build   ]   │ ← This bar
└─────────────────────────────────────────────────────────┘
```

**📍 Find the Device Dropdown:**
- Look for text like "iPhone 15 Pro Simulator" or "iPhone SE Simulator"
- It's RIGHT NEXT to the Play button ▶️
- Click the **dropdown arrow ▼** next to the device name

**🖥️ Device Selection Menu Opens:**
```
┌─────────────────────────────────────┐
│ iOS Simulators                      │
├─────────────────────────────────────┤
│ iPhone 15 Pro                      │
│ iPhone 15                          │  
│ iPad Air                           │
├─────────────────────────────────────┤
│ iOS Devices                        │ ← Look for this section
├─────────────────────────────────────┤
│ ● Any iOS Device (arm64)           │ ← SELECT THIS ONE!
└─────────────────────────────────────┘
```

**✅ CLICK "Any iOS Device (arm64)"** - This is REQUIRED for App Store archive!

**Visual Confirmation:**
After selection, top-left should show:
```
▶️ [App >] [Any iOS Device (arm64) ▼] [   Build   ]
```

---

### **Step 2: Go to Product Menu**

**🖥️ Look at the TOP MENU BAR of your Mac:**
```
🍎 File  Edit  View  Navigate  Editor  Product  Debug  Source Control  Window  Help
                                       ↑
                                   CLICK HERE
```

**📍 Click "Product" in the menu bar** (NOT inside Xcode, but at the very top of your screen)

**🖥️ Product Menu Drops Down:**
```
┌─────────────────────────────────────┐
│ Run                            ⌘R   │
│ Test                           ⌘U   │  
│ Profile                        ⌘I   │
│ Analyze                             │
│ ─────────────────────────────────── │
│ Build                          ⌘B   │
│ Build For                      >    │
│ Clean Build Folder        ⇧⌘K      │
│ ─────────────────────────────────── │
│ Archive                             │ ← CLICK THIS!
│ ─────────────────────────────────── │
│ Destination                    >    │
└─────────────────────────────────────┘
```

**✅ CLICK "Archive"** (near the bottom of the menu)

---

### **Step 3: Archive Build Process**

**🖥️ After clicking Archive, you'll see:**

**Build Progress (3-5 minutes):**
```
┌─────────────────────────────────────────┐
│ Building "DashDice"... ████████▒▒▒ 80% │ ← Progress bar
├─────────────────────────────────────────┤
│ Build Log (you can ignore this):       │
│ > CompileC                              │
│ > Ld                                    │
│ > CodeSign                              │
│ > Archive                               │
└─────────────────────────────────────────┘
```

**During this time:**
- ✅ **Don't close Xcode** - Let it finish
- ✅ **Don't use the computer** - Avoid interfering  
- ✅ **Wait patiently** - 3-5 minutes is normal
- ⚠️ **If it fails** - See troubleshooting below

---

### **Step 4: Organizer Window Automatically Opens**

**🖥️ When build succeeds, this window appears:**
```
┌─────────────────────────────────────────┐
│ 📦 Organizer                            │
├─────────────────────────────────────────┤
│ Archives  Crashes  Device Logs  Energy │ ← Tabs
├─────────────────────────────────────────┤
│ 📱 DashDice                            │ ← Your app!
│    Version 1.0.0 (1)                  │
│    Today 2:34 PM                      │
│    ✅ Valid for App Store              │ ← Success!
├─────────────────────────────────────────┤
│                                         │
│  [🔵 Distribute App]  [Show Package]   │ ← Blue button
│                                         │
└─────────────────────────────────────────┘
```

**✅ Success Indicators:**
- Green checkmark ✅ "Valid for App Store"
- Your app name "DashDice" appears
- No red error messages

**✅ CLICK the BLUE "Distribute App" button**

---

## 🚨 **Troubleshooting Archive Issues**

### **"Archive" is Grayed Out / Disabled:**
**Problem:** You didn't select "Any iOS Device (arm64)"
**Solution:** 
1. Go back to Step 1
2. Click device dropdown again  
3. Select "Any iOS Device (arm64)"
4. Try Product → Archive again

### **Build Fails with Signing Error:**
```
❌ Error: "No iOS Distribution signing identity found"
```
**Solution:**
1. **Xcode → Preferences** (in top menu)
2. **Accounts tab**
3. **Add Apple ID** if not present
4. **Download Manual Profiles**
5. Try archive again

### **"Missing Bundle Identifier" Error:**
**Solution:**
1. Click **"App"** project in left sidebar
2. Select **"App"** target
3. **General tab**
4. Verify **Bundle Identifier:** `com.dashdice.app`
5. Try archive again

### **Build Takes Too Long (>10 minutes):**
**Solution:**
1. **Product → Clean Build Folder** (⇧⌘K)
2. Wait for it to finish
3. Try **Product → Archive** again

---

## 🎯 **What You Should See vs. Problems**

### **✅ CORRECT - Archive Success:**
```
✅ Build completed successfully
✅ Organizer window opens automatically  
✅ "Valid for App Store" appears
✅ Blue "Distribute App" button is clickable
```

### **❌ WRONG - Common Problems:**
```
❌ "Archive" menu item is grayed out
   → Need to select "Any iOS Device (arm64)"

❌ Build fails with red errors
   → Check signing certificates

❌ "Not eligible for App Store"  
   → Wrong target device selected
```

**Once you see the Organizer with "Valid for App Store" ✅, you're ready to continue with the upload process!**

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

### **"Missing Required Icon Files" (167x167 & 152x152):**
```
❌ Error: "Missing required icon file. The bundle does not contain an app icon for iPad"
❌ Missing: 152x152 icon for iPad Pro
❌ Missing: 167x167 icon for iPad Pro
```
**Solution:**
1. **Go back to appicon.co** and generate a COMPLETE iOS icon set
2. **Make sure to select "iPad" when generating icons**
3. **Download the complete pack with ALL sizes**
4. **In Xcode**: Assets.xcassets → AppIcon → Add the missing iPad icons
5. **Critical sizes**: 152x152 and 167x167 are REQUIRED for iPad support
6. Try archive again

### **"Upload Failed"**
- Check internet connection
- Verify Apple Developer account is active
- Try uploading smaller build

---

**🎉 Your DashDice app is ready for the App Store! The MacinCloud session should take about 1 hour total to complete the entire submission process.**