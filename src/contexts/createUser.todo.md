Here's how to properly implement user creation without auto-sign-in using the Firebase Admin SDK:

1. First, let's create a Cloud Function to handle user creation:

```typescript
// In your Cloud Functions file (e.g., functions/src/index.ts)
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

export const createUserByAdmin = functions.https.onCall(async (data, context) => {
  // Verify the request comes from an authenticated admin
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only admins can create users'
    );
  }

  const { email, displayName } = data;

  try {
    // Create the user
    const userRecord = await admin.auth().createUser({
      email,
      emailVerified: false,
      password: Math.random().toString(36).slice(-8), // Random password
      displayName,
    });

    // Set custom claims if needed
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      roles: ['member'] // or whatever roles you need
    });

    // Create user document in Firestore
    await admin.firestore().collection('users').doc(userRecord.uid).set({
      email,
      displayName,
      roles: ['member'],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Send password reset email
    const link = await admin.auth().generatePasswordResetLink(email);
    // You might want to use a custom email service here
    await admin.auth().generateEmailVerificationLink(email);

    return { success: true, userId: userRecord.uid };
  } catch (error) {
    console.error('Error creating user:', error);
    throw new functions.https.HttpsError('internal', 'Error creating user');
  }
});
```

2. Deploy your Cloud Functions:
```bash
firebase deploy --only functions
```

3. Update your frontend to call this function:

```typescript
const createUserAndSendInvite = async (request: CreateUserRequest) => {
  try {
    const createUserFunction = httpsCallable(functions, 'createUserByAdmin');
    await createUserFunction({
      email: request.email,
      displayName: request.displayName,
    });
    enqueueSnackbar('Einladung wurde erfolgreich versendet', { variant: 'success' });
  } catch (error) {
    console.error('Error creating user:', error);
    enqueueSnackbar('Fehler beim Erstellen des Benutzers', { variant: 'error' });
    throw error;
  }
};
```

4. Make sure your security rules allow admins to create users:

```javascript
// Firestore rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow create: if request.auth.token.admin == true;
      allow update, delete: if request.auth.token.admin == true || 
                           request.auth.uid == userId;
    }
  }
}
```

Key points about this solution:

1. The Admin SDK runs on your server, so it doesn't affect the client's auth state
2. The user gets a password reset email to set their own password
3. You maintain full control over the user creation process
4. The admin stays logged in as themselves

To implement this:

1. Deploy the Cloud Function
2. Update your frontend code to call the function
3. Update your security rules
4. Test the flow as an admin

Would you like me to help you implement any specific part of this solution?