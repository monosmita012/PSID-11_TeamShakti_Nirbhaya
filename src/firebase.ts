import { initializeApp, getApps } from "firebase/app";
import { getAuth, browserSessionPersistence, setPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD4H5GaqjIxMCQwIr1dE9elIM_sMGxNs1I",
  authDomain: "nirbhaya-aeea4.firebaseapp.com",
  projectId: "nirbhaya-aeea4",
  storageBucket: "nirbhaya-aeea4.firebasestorage.app",
  messagingSenderId: "478442441771",
  appId: "1:478442441771:web:5ecb1d01dbc5fa005b6e6e"
};

// Initialize Firebase only if it hasn't been initialized already
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

// Dev-only log to confirm the web client is pointed at the expected Firebase project
if (import.meta.env.DEV) {
  console.info("Firebase configured with real credentials - duplicate app issue fixed", {
    projectId: firebaseConfig.projectId,
    appId: firebaseConfig.appId,
    authDomain: firebaseConfig.authDomain,
  });
}

export const auth = getAuth(app);
export const db = getFirestore(app);

// Use session persistence so auth clears when the browser (not just tab) closes.
// This ensures the login page always shows on a fresh browser open.
setPersistence(auth, browserSessionPersistence).catch(() => {});
