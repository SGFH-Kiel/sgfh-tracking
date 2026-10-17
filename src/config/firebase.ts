import { initializeApp } from 'firebase/app';
import { getAuth, browserLocalPersistence, browserSessionPersistence, setPersistence, connectAuthEmulator } from 'firebase/auth';
import { initializeFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { isStandalone } from '../pwa/pwa';

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
// Im Browser gilt die Anmeldung für die Sitzung (endet beim Schließen des Tabs).
// Als installierte App (Home-Bildschirm) bleibt man angemeldet – sonst wäre bei jedem Start ein Login nötig.
setPersistence(auth, isStandalone() ? browserLocalPersistence : browserSessionPersistence).catch(error => {
  console.error('Error setting auth persistence:', error);
});

// Initialize Firestore with memory cache enabled
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  cacheSizeBytes: 1048576 // 1 MB
});

// Connect to local emulators when REACT_APP_USE_EMULATOR=true
if (process.env.REACT_APP_USE_EMULATOR === 'true') {
  connectFirestoreEmulator(db, 'localhost', 9099);
  connectAuthEmulator(auth, 'http://localhost:9098', { disableWarnings: true });
  console.info('[Emulator] Connected to local Firestore (9099) and Auth (9098) emulators.');
}
