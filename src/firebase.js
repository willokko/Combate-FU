// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import publicConfig from './config/firebase.public.js';

// Firebase configuration
const environmentConfig = {
  apiKey: import.meta.env?.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env?.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env?.VITE_FIREBASE_MEASUREMENT_ID,
};
// These web-app identifiers are public. Authorization is enforced by rules.
const firebaseConfig = { ...publicConfig, ...Object.fromEntries(Object.entries(environmentConfig).filter(([, value]) => value)) };

// Initialize Firebase
export const remoteEnabled = import.meta.env?.VITE_DATA_MODE === 'remote' && Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
export const cloudEnabled = !remoteEnabled && import.meta.env?.VITE_ENABLE_CLOUD !== 'false' && Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
const app = remoteEnabled || cloudEnabled ? initializeApp(firebaseConfig) : null;
export const firestore = app ? getFirestore(app) : null;
export const auth = app ? getAuth(app) : null;
export const googleAuthProvider = new GoogleAuthProvider();
