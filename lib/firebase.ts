import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBlihcyw8FMR-Wox3ttXzn5LMG8Vd3eMn0",
  authDomain: "kiconu-app.firebaseapp.com",
  projectId: "kiconu-app",
  storageBucket: "kiconu-app.firebasestorage.app",
  messagingSenderId: "999055210705",
  appId: "1:999055210705:web:2232750efc2dd7273f2df0",
  measurementId: "G-Z9BYCL16CS",
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
