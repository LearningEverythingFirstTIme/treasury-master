import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { browser } from '$app/environment';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

// Only initialize Firebase in the browser
if (browser) {
  const hasAllConfig = Object.values(firebaseConfig).every(v => v && v !== '');
  
  if (hasAllConfig) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
  } else {
    console.error('Missing Firebase configuration');
  }
} else {
  // Server-side: create dummy objects that throw if accessed
  const throwServerError = () => {
    throw new Error('Firebase cannot be used during SSR');
  };
  auth = { onAuthStateChanged: throwServerError } as unknown as Auth;
  db = { collection: throwServerError } as unknown as Firestore;
}

export { auth, db };
