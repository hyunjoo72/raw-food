import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// Initialize Firestore with specific database ID if specified
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');

// Initialize Firebase Auth
export const auth = getAuth(app);

// Helper to ensure user is authenticated
export const ensureAuthenticated = (): Promise<User> => {
  return new Promise((resolve, reject) => {
    if (auth.currentUser) {
      resolve(auth.currentUser);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        unsubscribe();
        resolve(user);
      } else {
        try {
          const userCredential = await signInAnonymously(auth);
          unsubscribe();
          resolve(userCredential.user);
        } catch (error) {
          unsubscribe();
          reject(error);
        }
      }
    });
  });
};

// Validate connection
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client appears to be offline.');
    }
  }
}

testConnection();
