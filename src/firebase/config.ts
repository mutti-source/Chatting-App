import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import { 
  Auth, 
  getAuth, 
  // @ts-ignore
  getReactNativePersistence, 
  initializeAuth 
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;

if (!apiKey || apiKey.trim() === "" || apiKey === '""') {
  console.warn(
    "[Firebase Config Warning]: EXPO_PUBLIC_FIREBASE_API_KEY is missing or empty in your environment variables. " +
    "Please ensure your .env file is populated with valid Firebase credentials."
  );
}


const firebaseConfig = {
  apiKey: apiKey || "",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL || "",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "",
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || "",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Auth with persistence safely initialized for React Native / Expo fast refresh
let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  auth = getAuth(app);
}

const db = getFirestore(app);

export { auth, db };


