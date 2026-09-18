import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  orderBy, 
  query,
  getDocFromServer
} from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

// Initialize Firebase client safely
export const firebaseApp = !getApps().length 
  ? initializeApp(firebaseConfig) 
  : getApp();

export const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

/**
 * Executes a promise with an automatic timeout to prevent hanging API requests
 */
export async function withTimeout<T>(
  promise: Promise<T>, 
  timeoutMs: number = 7000, 
  fallbackMsg: string = "Firestore operation timed out"
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(fallbackMsg)), timeoutMs)
    )
  ]);
}

/**
 * Tests live connection to Firestore
 */
export async function checkFirestoreHealth(): Promise<boolean> {
  try {
    await withTimeout(getDocFromServer(doc(db, "test", "connection")), 4000);
    return true;
  } catch (err: any) {
    // If the doc doesn't exist, that still means we reached the server
    if (err?.code === "not-found" || err?.message?.includes("No document to update")) {
      return true;
    }
    console.warn("[Firebase] Health check warning:", err?.message || err);
    return false;
  }
}
