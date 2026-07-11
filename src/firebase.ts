/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  projectId: "zonewatch-4581f",
  appId: "1:316486521251:web:d713c72b22572b9a1fcbb1",
  storageBucket: "zonewatch-4581f.firebasestorage.app",
  apiKey: "AIzaSyDr94qf0w81D-x9W48c2Q2Lp6PzN5-gO5k",
  authDomain: "zonewatch-4581f.firebaseapp.com",
  messagingSenderId: "316486521251"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export default app;
