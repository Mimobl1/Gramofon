import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, getDoc, enableIndexedDbPersistence } from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);

// Attempt to enable persistence to handle offline/connectivity issues better
try {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
        console.warn("Persistence failed: Multiple tabs open");
    } else if (err.code === 'unimplemented') {
        console.warn("Persistence not supported");
    }
  });
} catch (e) {
  console.error("Persistence error", e);
}

export async function testFirestoreConnection() {
  try {
    const docRef = doc(db, "test", "connection");
    const docSnap = await getDoc(docRef);
    console.log("Firestore connection test passed:", docSnap.exists());
  } catch (error) {
    console.error("Firestore connection failed:", error);
  }
}

testFirestoreConnection();
