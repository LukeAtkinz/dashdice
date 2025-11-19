# Firebase Abilities Setup Guide

## Quick Setup (3 Steps)

### 1. Sync Abilities to Firebase

Run the sync script to upload all abilities and grant them to all users:

```powershell
# Install dependencies if needed
npm install firebase-admin ts-node

# Run the sync script
npx ts-node sync-abilities-to-firebase.ts
```

This will:
- ✅ Upload all 9 ability definitions to Firebase `abilities` collection
- ✅ Grant all abilities to every existing user
- ✅ Verify icon paths exist

### 2. Prepare Icon Files

Create the icon directory structure and placeholder icons:

```powershell
# Create directories
mkdir -p public/Abilities/Catagories/Tactical
mkdir -p public/Abilities/Catagories/Attack
mkdir -p public/Abilities/Catagories/Defense
mkdir -p public/Abilities/Catagories/Utility

# Icons needed (you can use placeholders initially):
```

**Required Icons:**

| Ability | Category | File Path |
|---------|----------|-----------|
| Luck Turner | Tactical | `/Abilities/Catagories/Tactical/Luck Turner.webp` |
| Vital Rush | Tactical | `/Abilities/Catagories/Tactical/Vital Rush.webp` |
| Aura Axe | Attack | `/Abilities/Catagories/Attack/Aura Axe.webp` |
| Score Saw | Attack | `/Abilities/Catagories/Attack/Score Saw.webp` |
| Score Siphon | Attack | `/Abilities/Catagories/Attack/Score Siphon.webp` |
| Pan Slap | Defense | `/Abilities/Catagories/Defense/Pan Slap.webp` |
| Hard Hat | Defense | `/Abilities/Catagories/Defense/Hard Hat.webp` |
| Power Pull | Utility | `/Abilities/Catagories/Utility/Power Pull.webp` |
| Aura Forge | Utility | `/Abilities/Catagories/Utility/Aura Forge.webp` |

**Icon Sources (from your descriptions):**
- Luck Turner: `hand holding wrench.png`
- Vital Rush: `hand holding stethoscope.png`
- Aura Axe: `hand holding axe.png`
- Pan Slap: `hand holding pan.png`
- Power Pull: `hand holding welding tool.png`
- Aura Forge: `hand holding hammer.png`

### 3. Update AbilitiesContext to Load from Firebase

The `AbilitiesContext` should automatically load abilities from Firebase. Verify it's fetching from the `abilities` collection:

```typescript
// src/context/AbilitiesContext.tsx should have:
useEffect(() => {
  const abilitiesRef = collection(db, 'abilities');
  const unsubscribe = onSnapshot(abilitiesRef, (snapshot) => {
    const abilitiesData = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    }));
    setAllAbilities(abilitiesData);
  });
  
  return () => unsubscribe();
}, []);
```

## Alternative: Quick Firebase Console Upload

If you prefer not to run the script, you can manually upload via Firebase Console:

1. Go to Firebase Console → Firestore Database
2. Create `abilities` collection
3. For each ability, create a document with the ability ID
4. Copy the ability data from `abilities.ts`

## Verify Setup

After syncing, check:

1. **Firebase Console:**
   - ✅ `abilities` collection has 9 documents
   - ✅ Each user document has `ownedAbilities` array with all ability IDs

2. **In-Game:**
   - ✅ Open Vault → Powers tab
   - ✅ All 9 abilities should appear
   - ✅ Icons should display (or fallback emoji if missing)

3. **In-Match:**
   - ✅ Abilities appear in the match interface
   - ✅ Can click and use abilities
   - ✅ AURA costs display correctly

## Troubleshooting

### Icons Not Showing
- Check file paths match exactly (case-sensitive)
- Use `.webp`, `.png`, or `.jpg` format
- Fallback: Category emoji will show if icon missing (🎯⚔️🛡️🔧💫)

### Abilities Not Appearing
- Check Firebase Console → `abilities` collection exists
- Check user document has `ownedAbilities` array
- Check browser console for errors
- Verify AbilitiesContext is loading data

### Can't Use Abilities
- Check AURA cost (player must have enough)
- Check timing (some abilities only work on opponent's turn)
- Check usage count (most abilities are once per match)
- Check browser console logs for detailed error messages

## Firebase Rules

Ensure your Firestore rules allow reading abilities:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Abilities - readable by all authenticated users
    match /abilities/{abilityId} {
      allow read: if request.auth != null;
      allow write: if false; // Only server can write
    }
    
    // Users - can read own data
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Next Steps

After setup is complete:

1. **Test each ability** in a match
2. **Add real icons** to replace placeholders
3. **Balance abilities** based on gameplay testing
4. **Add animations** for ability activation
5. **Create ability tutorials** for new players

## Current Abilities Summary

| ID | Name | Category | Rarity | Cost | Description |
|----|------|----------|--------|------|-------------|
| `luck_turner` | Luck Turner | Tactical | Epic | 3 | 50% less chance to roll 1 |
| `vital_rush` | Vital Rush | Tactical | Epic | 4 | ×3 multiplier, flatline on doubles |
| `aura_axe` | Aura Axe | Attack | Epic | 4 | Drain 50% opponent aura |
| `score_saw` | Score Saw | Attack | Epic | 5 | Cut 50% of banked score, steal half |
| `siphon` | Score Siphon | Attack | Epic | 3 | Steal 50% when opponent banks |
| `pan_slap` | Pan Slap | Defense | Epic | 5 | Stop opponent's turn, auto-bank |
| `hard_hat` | Hard Hat | Defense | Epic | 4 | Block next opponent ability |
| `power_pull` | Power Pull | Utility | Rare | 2 | Convert score to aura when banking |
| `aura_forge` | Aura Forge | Utility | Rare | 0 | Instantly convert 5-20 points to 1-4 aura |

---

Need help? Check console logs with these prefixes:
- 🎯 = Ability activation
- 🔨 = Aura Forge
- 🪓 = Aura Axe  
- 💓 = Vital Rush
- 🍀 = Luck Turner
- 🪚 = Score Saw
- ⚔️ = Siphon
- 🍳 = Pan Slap
- ⚡ = Power Pull
