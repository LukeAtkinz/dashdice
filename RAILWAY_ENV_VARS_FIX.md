# Railway Environment Variables Setup

## 🚂 Fix Railway Deployment for Matchmaking

Since you need Railway for matchmaking, here's how to fix the dependency conflicts:

### **Method 1: Environment Variables (Recommended)**

**In Railway Dashboard:**
1. Go to your Railway project
2. Click "Variables" tab
3. Add these environment variables:

```
NPM_CONFIG_LEGACY_PEER_DEPS=true
NPM_CONFIG_FORCE=true
NODE_OPTIONS=--max-old-space-size=4096
```

### **Method 2: Force Nixpacks Configuration**

**I've created `nixpacks.toml`** which Railway should respect:
```toml
[phases.install]
cmd = "npm install --legacy-peer-deps"

[phases.build]
cmd = "npm run build"

[start]
cmd = "npm start"
```

### **Method 3: Alternative Package.json Scripts**

If Railway still doesn't work, we can create Railway-specific scripts:

```json
{
  "scripts": {
    "railway:install": "npm install --legacy-peer-deps",
    "railway:build": "npm run railway:install && npm run build",
    "railway:start": "npm start"
  }
}
```

### **Method 4: Remove Expo Dependencies for Railway**

**Quick Fix - Remove problematic packages temporarily:**
1. Create a separate branch for Railway
2. Remove Expo dependencies from package.json
3. Deploy that branch to Railway
4. Keep main branch with all dependencies

### **Immediate Action Steps:**

1. **Add environment variables** in Railway dashboard
2. **Commit nixpacks.toml** (I've created it)
3. **Trigger new deployment**

### **Commands to run:**
```bash
git add nixpacks.toml
git commit -m "Add nixpacks.toml for Railway deployment fix"
git push origin main
```

This should force Railway to use legacy peer deps during installation.