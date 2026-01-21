// Firebase Configuration for Al Huzaifa Digital PWA
import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

// Firebase Web SDK Configuration
// Using your Firebase project: al-huzaifa-app-1c0e2
const firebaseConfig = {
  apiKey: "AIzaSyBztP_yOsoWQtKz9D0Gqi-GEVNzVtjxGC4",
  authDomain: "al-huzaifa-app-1c0e2.firebaseapp.com",
  projectId: "al-huzaifa-app-1c0e2",
  storageBucket: "al-huzaifa-app-1c0e2.firebasestorage.app",
  messagingSenderId: "547876705000",
  appId: "1:547876705000:web:38a029193866f9cfbfaf5d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with offline persistence
export const db = getFirestore(app);

// Enable offline persistence (IndexedDB)
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled in one tab at a time
      console.warn('Persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      // The current browser does not support all of the features required
      console.warn('Persistence not available');
    }
  });
}

// Initialize Storage
export const storage = getStorage(app);

// Initialize Auth
export const auth = getAuth(app);

export default app;
