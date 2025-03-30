import { initializeApp } from 'firebase/app';
import { getAuth, browserSessionPersistence, setPersistence } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';

if (!process.env.REACT_APP_FIREBASE_API_KEY || !process.env.REACT_APP_FIREBASE_PROJECT_ID) {
  throw new Error('Firebase configuration is missing. Please check your .env file.');
}

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_MEASUREMENT_ID
};

let app;
try {
  app = initializeApp(firebaseConfig);
} catch (error) {
  console.error('Error initializing Firebase:', error);
  throw error;
}

export const auth = getAuth(app);
// Set auth persistence to session (cleared when window/tab is closed)
setPersistence(auth, browserSessionPersistence).catch(error => {
  console.error('Error setting auth persistence:', error);
});

// Initialize Firestore with memory cache enabled
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  cacheSizeBytes: 1048576 // 1 MB
});
