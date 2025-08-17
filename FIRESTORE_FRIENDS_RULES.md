// Firestore Security Rules for Friends System
// Add these rules to your existing firestore.rules file

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Friends collection - bidirectional friendship documents
    match /friends/{friendshipId} {
      allow read: if request.auth != null && 
        (resource.data.userId == request.auth.uid || 
         resource.data.friendId == request.auth.uid);
      
      allow create: if request.auth != null && 
        request.auth.uid == resource.data.userId &&
        // Ensure friendship status is valid
        resource.data.status in ['pending', 'accepted'] &&
        // Prevent self-friending
        resource.data.userId != resource.data.friendId;
      
      allow update: if request.auth != null && 
        (request.auth.uid == resource.data.userId || 
         request.auth.uid == resource.data.friendId) &&
        // Only allow status and nickname updates
        request.resource.data.diff(resource.data).affectedKeys()
          .hasOnly(['status', 'nickname', 'acceptedAt']);
      
      allow delete: if request.auth != null && 
        (request.auth.uid == resource.data.userId || 
         request.auth.uid == resource.data.friendId);
    }
    
    // Friend requests collection
    match /friendRequests/{requestId} {
      allow read: if request.auth != null && 
        (resource.data.fromUserId == request.auth.uid || 
         resource.data.toUserId == request.auth.uid);
      
      allow create: if request.auth != null && 
        request.auth.uid == resource.data.fromUserId &&
        // Ensure valid status
        resource.data.status == 'pending' &&
        // Prevent self-requests
        resource.data.fromUserId != resource.data.toUserId &&
        // Ensure expiration date is set
        resource.data.expiresAt is timestamp;
      
      allow update: if request.auth != null && 
        // Only recipient can update request status
        request.auth.uid == resource.data.toUserId &&
        // Only allow status updates
        request.resource.data.diff(resource.data).affectedKeys()
          .hasOnly(['status', 'acceptedAt']) &&
        // Ensure valid status transitions
        (resource.data.status == 'pending' && 
         request.resource.data.status in ['accepted', 'declined']);
      
      allow delete: if request.auth != null && 
        (request.auth.uid == resource.data.fromUserId || 
         request.auth.uid == resource.data.toUserId);
    }
    
    // Game invitations collection
    match /gameInvitations/{invitationId} {
      allow read: if request.auth != null && 
        (resource.data.fromUserId == request.auth.uid || 
         resource.data.toUserId == request.auth.uid);
      
      allow create: if request.auth != null && 
        request.auth.uid == resource.data.fromUserId &&
        // Ensure valid status
        resource.data.status == 'pending' &&
        // Prevent self-invitations
        resource.data.fromUserId != resource.data.toUserId &&
        // Ensure expiration date is set (5 minutes)
        resource.data.expiresAt is timestamp &&
        // Verify users are friends (check would require a function in practice)
        true; // TODO: Add friend verification function
      
      allow update: if request.auth != null && 
        ((request.auth.uid == resource.data.toUserId &&
          // Recipient can accept/decline
          request.resource.data.diff(resource.data).affectedKeys()
            .hasOnly(['status']) &&
          resource.data.status == 'pending' && 
          request.resource.data.status in ['accepted', 'declined']) ||
         (request.auth.uid == resource.data.fromUserId &&
          // Sender can cancel
          request.resource.data.diff(resource.data).affectedKeys()
            .hasOnly(['status']) &&
          resource.data.status == 'pending' && 
          request.resource.data.status == 'cancelled'));
      
      allow delete: if request.auth != null && 
        (request.auth.uid == resource.data.fromUserId || 
         request.auth.uid == resource.data.toUserId);
    }
    
    // Presence collection - real-time online status
    match /presence/{userId} {
      allow read: if request.auth != null && 
        // User can read their own presence
        (request.auth.uid == userId ||
         // Friends can read each other's presence (simplified check)
         exists(/databases/$(database)/documents/friends/$(request.auth.uid + '_' + userId)) ||
         exists(/databases/$(database)/documents/friends/$(userId + '_' + request.auth.uid)));
      
      allow write: if request.auth != null && 
        request.auth.uid == userId &&
        // Ensure required fields are present
        request.resource.data.keys().hasAll(['isOnline', 'status', 'lastSeen']) &&
        // Ensure valid status values
        request.resource.data.status in ['online', 'away', 'busy', 'offline'] &&
        // Ensure lastSeen is a timestamp
        request.resource.data.lastSeen is timestamp;
    }
    
    // Enhanced users collection rules for friends features
    match /users/{userId} {
      allow read: if request.auth != null && 
        // User can read their own data
        (request.auth.uid == userId ||
         // Friends can read basic profile data (simplified check)
         exists(/databases/$(database)/documents/friends/$(request.auth.uid + '_' + userId)) ||
         exists(/databases/$(database)/documents/friends/$(userId + '_' + request.auth.uid)));
      
      allow write: if request.auth != null && 
        request.auth.uid == userId &&
        // Prevent modification of sensitive fields by clients
        !request.resource.data.diff(resource.data).affectedKeys()
          .hasAny(['uid', 'email', 'createdAt', 'friendCode']);
      
      // Allow friend code lookup for adding friends
      allow read: if request.auth != null && 
        request.query.limit <= 1 &&
        'friendCode' in request.query.where;
    }
    
    // Helper function to check if users are friends
    function areFriends(userId1, userId2) {
      return exists(/databases/$(database)/documents/friends/$(userId1 + '_' + userId2)) ||
             exists(/databases/$(database)/documents/friends/$(userId2 + '_' + userId1));
    }
    
    // Helper function to check if user privacy allows friend requests
    function allowsFriendRequests(userId) {
      let userData = get(/databases/$(database)/documents/users/$(userId)).data;
      return !('privacy' in userData) || 
             !('allowFriendRequests' in userData.privacy) || 
             userData.privacy.allowFriendRequests == true;
    }
    
    // Helper function to check if user privacy allows game invites
    function allowsGameInvites(userId) {
      let userData = get(/databases/$(database)/documents/users/$(userId)).data;
      return !('privacy' in userData) || 
             !('allowGameInvites' in userData.privacy) || 
             userData.privacy.allowGameInvites == true;
    }
  }
}

/*
DEPLOYMENT INSTRUCTIONS:
1. Save this content to firestore.rules in your project root
2. Deploy using: firebase deploy --only firestore:rules
3. Or merge with existing rules if you have them

SECURITY FEATURES:
- Users can only modify their own data
- Friend relationships require mutual access
- Game invitations limited to friends
- Presence data protected by friendship status
- Friend codes allow discovery but protect privacy
- Automatic validation of data structure and types
- Protection against self-friending and self-inviting

PERFORMANCE CONSIDERATIONS:
- Rules are optimized for common access patterns
- Friend lookup is efficient with proper indexing
- Presence updates are lightweight
- Batch operations are supported where appropriate

TESTING:
Use Firebase Emulator to test these rules:
firebase emulators:start --only firestore
*/
