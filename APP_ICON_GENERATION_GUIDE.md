# App Icon Generation Guide for DashDice

## 📱 Required iOS App Icon Sizes

You need to generate these icon sizes from your `public/App Icons/appstore.png`:

### **iPhone App Icons:**
- **20x20pt**: 40×40px (@2x), 60×60px (@3x)
- **29x29pt**: 58×58px (@2x), 87×87px (@3x) 
- **40x40pt**: 80×80px (@2x), 120×120px (@3x)
- **60x60pt**: 120×120px (@2x), 180×180px (@3x)

### **App Store:**
- **1024×1024px**: App Store listing icon

## 🛠️ Easy Generation Methods

### **Method 1: AppIcon.co (Recommended)**
1. Go to: https://appicon.co/
2. Upload your `public/App Icons/appstore.png`
3. Select "iOS" platform
4. Download the complete icon set
5. Extract the files

### **Method 2: Icon Generator (Alternative)**
1. Go to: https://icon.kitchen/
2. Upload your icon
3. Generate iOS icons
4. Download the package

### **Method 3: Figma/Canva (Manual)**
1. Import your 1024×1024 icon
2. Create artboards for each size needed
3. Export all sizes as PNG
4. Name them correctly (see naming below)

## 📝 Icon Naming Convention

When you download from appicon.co, rename them to match Xcode requirements:

```
icon-20@2x.png     (40×40px)
icon-20@3x.png     (60×60px)
icon-29@2x.png     (58×58px)
icon-29@3x.png     (87×87px)
icon-40@2x.png     (80×80px)
icon-40@3x.png     (120×120px)
icon-60@2x.png     (120×120px)
icon-60@3x.png     (180×180px)
icon-1024.png      (1024×1024px)
```

## 📂 File Organization

Create this folder structure for MacinCloud session:

```
Desktop/
└── DashDice_Icons/
    ├── icon-20@2x.png
    ├── icon-20@3x.png
    ├── icon-29@2x.png
    ├── icon-29@3x.png
    ├── icon-40@2x.png
    ├── icon-40@3x.png
    ├── icon-60@2x.png
    ├── icon-60@3x.png
    └── icon-1024.png
```

## ✅ Icon Quality Checklist

- [ ] All icons are PNG format
- [ ] All icons have transparent backgrounds (if applicable)
- [ ] Icons are crisp and clear at small sizes
- [ ] 1024×1024 icon looks good for App Store
- [ ] All required sizes present
- [ ] Proper naming convention used

## 🎯 Quick Action Steps:

1. **Right now**: Go to appicon.co and generate your icons
2. **Save them**: To your Desktop in a "DashDice_Icons" folder
3. **Ready for MacinCloud**: You'll drag these into Xcode

This should take about 5 minutes to complete!