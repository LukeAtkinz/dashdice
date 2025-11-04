/**
 * Script to reset Firebase abilities collection
 * Removes old abilities and adds only the current defined abilities (Luck Turner)
 */

// This would be run as an admin operation to clean up Firebase
const resetAbilitiesInstructions = `
🧹 FIREBASE ABILITIES RESET INSTRUCTIONS

The abilities collection currently has 17 old abilities that need to be removed.
We only want our newly defined abilities (currently just Luck Turner).

STEPS TO RESET:

1. Go to Firebase Console → Firestore Database
2. Navigate to the 'abilities' collection  
3. DELETE ALL existing documents (all 17 abilities)
4. The app will automatically re-seed with Luck Turner when you visit the PowerTab

OR use Firebase CLI:
firebase firestore:delete --all-collections --force abilities

This will clean out the old abilities and let the app seed fresh with our new definitions.
`;

console.log(resetAbilitiesInstructions);

export { resetAbilitiesInstructions };