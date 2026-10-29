import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {

  apiKey: "AIzaSyCc-3AS_he7fQ19G2BFsXRevJexSQ7Zggk",

  authDomain: "antrianpro-aa282.firebaseapp.com",

  projectId: "antrianpro-aa282",

  storageBucket: "antrianpro-aa282.firebasestorage.app",

  messagingSenderId: "820400935691",

  appId: "1:820400935691:web:f126abad86288044d5c80e"

};


const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const db = getDatabase(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();