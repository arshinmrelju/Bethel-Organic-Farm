import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

import {
  firebaseConfig,
  isFirebaseConfigured,
} from "../config/firebase-config.js";

/**
 * One shared Firebase app instance for all starter pages.
 * While the config placeholder is present, services stay null so the site can
 * still load locally without making failed network calls.
 */
let app = null;
let auth = null;
let db = null;
let storage = null;

if (isFirebaseConfigured) {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
}

export { app, auth, db, storage, isFirebaseConfigured };
