import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDrrS4E_6e3G1DBfqkFbWoYLhdq6ZIzapg",
  authDomain: "tes-webapps.firebaseapp.com",
  databaseURL: "https://tes-webapps-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "tes-webapps",
  storageBucket: "tes-webapps.firebasestorage.app",
  messagingSenderId: "87638829660",
  appId: "1:87638829660:web:5a04a73f02206803fa9499"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const db = getDatabase(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();