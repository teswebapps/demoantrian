import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAj9HxjOO8VVcujQW3dVcqcf-YMEOvyYHM",
  authDomain: "antriantes.firebaseapp.com",
  databaseURL: "https://antriantes-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "antriantes",
  storageBucket: "antriantes.firebasestorage.app",
  messagingSenderId: "387545260334",
  appId: "1:387545260334:web:b55cfaca0e4bec5bff9abf"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const db = getDatabase(app);
export const auth = getAuth(app);

setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Gagal mengatur persistence auth:", error);
});

export const googleProvider = new GoogleAuthProvider();