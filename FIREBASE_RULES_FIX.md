# Firebase Rules Update Instructions

## Current Issues:
1. **Firestore Permission Error**: Missing permissions for `matchHistory` collection
2. **Storage CORS Error**: Firebase Storage not configured with proper rules

## Manual Fix Required:

### 1. Update Firestore Rules
Go to [Firebase Console - Firestore Rules](https://console.firebase.google.com/project/dashdice-d1b86/firestore/rules)

Add this rule after the `completedmatches` section:

```javascript
// Match history - users can read and write their own match history
match /matchHistory/{userId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
  
  // Allow subcollections for match history entries
  match /matches/{matchId} {
    allow read, write: if request.auth != null && request.auth.uid == userId;
  }
}
```

### 2. Enable and Configure Firebase Storage
1. Go to [Firebase Console - Storage](https://console.firebase.google.com/project/dashdice-d1b86/storage)
2. Click "Get Started" to enable Firebase Storage
3. Choose production mode
4. Select your preferred storage location
5. Once enabled, go to the Rules tab
6. Replace the default rules with:

```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    // Profile pictures - users can upload and read their own profile pictures
    match /profile-pictures/{userId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow read access to background images for all authenticated users
    match /backgrounds/{fileName} {
      allow read: if request.auth != null;
    }
    
    // Game assets and design elements - read only for authenticated users
    match /{allPaths=**} {
      allow read: if request.auth != null;
    }
  }
}
```

### 3. Deploy Updated Rules
Once both are configured in the console, you can deploy them via CLI:

```bash
# Deploy only rules (skip indexes to avoid conflicts)
firebase deploy --only firestore:rules,storage
```

## Alternative CLI Commands:
If the above fails due to index conflicts, try:

```bash
# Deploy firestore rules only
firebase deploy --only firestore:rules --force

# Deploy storage rules only  
firebase deploy --only storage --force
```

## Verification:
After updating:
1. Refresh the DashDice app
2. Check browser console - permission errors should be resolved
3. Try uploading a profile picture - should work without CORS errors
4. Match history should load properly
