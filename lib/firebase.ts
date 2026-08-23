import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const getEnvVar = (nextKey: string, legacyKey: string, fallback: string) => {
  const val = process.env[nextKey] || process.env[legacyKey] || fallback;
  return val ? val.trim() : '';
};

const firebaseConfig = {
  apiKey: getEnvVar('NEXT_PUBLIC_FIREBASE_API_KEY', 'FIREBASE_API_KEY', 'AIzaSyAw9XHEzRuyN8kdTOKIsJ6BoPc_E81oa9Q'),
  authDomain: getEnvVar('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', 'FIREBASE_authDomain', 'reskudata.firebaseapp.com'),
  projectId: getEnvVar('NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'FIREBASE_projectId', 'reskudata'),
  storageBucket: getEnvVar('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', 'FIREBASE_storageBucket', 'reskudata.firebasestorage.app'),
  messagingSenderId: getEnvVar('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', 'FIREBASE_messagingSenderId', '491826751375'),
  appId: getEnvVar('NEXT_PUBLIC_FIREBASE_APP_ID', 'FIREBASE_appId', '1:491826751375:web:4897fd0dccb115a89f4dfa'),
  measurementId: getEnvVar('NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID', 'FIREBASE_measurementId', 'G-TXH3NLK4H2'),
};

// Initialize Firebase App Singleton
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Auth & Firestore
export const auth = getAuth(app);
export const db = getFirestore(app);

// 1. Standard Clean Google Provider (1-Click Fast Login, No Warning Screen)
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// 2. On-Demand Google Drive Provider (Request Drive/Sheets scope when user clicks "Hubungkan Drive Saya")
export const googleDriveProvider = new GoogleAuthProvider();
googleDriveProvider.addScope('https://www.googleapis.com/auth/spreadsheets');
googleDriveProvider.addScope('https://www.googleapis.com/auth/drive.file');
googleDriveProvider.setCustomParameters({
  prompt: 'consent',
});
