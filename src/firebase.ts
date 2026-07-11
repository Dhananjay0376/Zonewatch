/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  projectId: "zone-watch",
  appId: "1:316486521251:web:75196e3367b09ebb858a16",
  storageBucket: "zone-watch.firebasestorage.app",
  apiKey: "AIzaSyAwdMC4NbQg5Trn7Jyt6Zq7c7By-rCn-ME",
  authDomain: "zone-watch.firebaseapp.com",
  messagingSenderId: "316486521251"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export default app;
