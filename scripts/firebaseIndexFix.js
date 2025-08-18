// Firebase Index Fix Instructions

/*
The error you're seeing is:
FirebaseError: The query requires an index. You can create it here: https://console.firebase.google.com/v1/r/project/dashdice-d1b86/firestore/indexes?create_composite=Cl1wcm9qZWN0cy9kYXNoZGljZS1kMWI4Ni9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvYWNoaWV2ZW1lbnREZWZpbml0aW9ucy9pbmRleGVzL18QARoMCghpc0FjdGl2ZRABGgwKCGNhdGVnb3J5EAEaCQoFb3JkZXIQARoMCghfX25hbWVfXxAB

SOLUTION:
1. Click the link above or go to Firebase Console > Firestore > Indexes
2. Create a new composite index with these fields:

Collection: achievementDefinitions
Fields:
- isActive (Ascending)
- category (Ascending) 
- order (Ascending)
- __name__ (Ascending)

This index is needed for the query in AchievementsDashboard.tsx that filters and sorts achievements.

The query causing the issue is likely:
```javascript
db.collection('achievementDefinitions')
  .where('isActive', '==', true)
  .orderBy('category')
  .orderBy('order')
  .get()
```

ALTERNATIVE FIX - Update the query to avoid composite index:
Instead of using multiple orderBy clauses, we can:
1. Remove the orderBy for category/order from the Firebase query
2. Sort the results in JavaScript after fetching

This would change the query to just:
```javascript
db.collection('achievementDefinitions')
  .where('isActive', '==', true)
  .get()
```

Then sort in code:
```javascript
const sortedAchievements = achievements.sort((a, b) => {
  if (a.category !== b.category) {
    return a.category.localeCompare(b.category);
  }
  return a.order - b.order;
});
```
*/

// Implementation of the alternative fix
const getAchievements = async () => {
  try {
    // Simple query without multiple orderBy to avoid index requirement
    const snapshot = await db.collection('achievementDefinitions')
      .where('isActive', '==', true)
      .get();
    
    const achievements = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Sort in JavaScript instead of Firebase
    return achievements.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return (a.order || 0) - (b.order || 0);
    });
    
  } catch (error) {
    console.error('Error fetching achievements:', error);
    return [];
  }
};

module.exports = { getAchievements };
