// ============================================================
// BingeBeacon — Firebase Cloud Messaging (FCM) Setup
// Initializes Firebase for the client and handles FCM tokens.
// ============================================================

import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { api } from "./api";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

/**
 * Request permission and get FCM token.
 * Registers the token with the backend as a device.
 */
export async function subscribeToPush(): Promise<boolean> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return false;
  }

  try {
    const messaging = getMessaging(app);
    
    // Request permission
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("Notification permission denied.");
      return false;
    }

    // Get FCM Token
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    });

    if (!token) {
      console.warn("No FCM token received.");
      return false;
    }

    // Register with backend
    // The backend expects the token in the 'device_token' field
    await api.post("/me/devices", {
      device_token: token,
      platform: "web",
    });

    console.info("Successfully subscribed to BingeBeacon alerts.");
    return true;
  } catch (error) {
    console.error("Failed to subscribe to FCM:", error);
    return false;
  }
}

/**
 * Setup foreground message listener.
 */
export function onForegroundMessage(callback: (payload: any) => void) {
  if (typeof window === "undefined") return;
  
  const messaging = getMessaging(app);
  return onMessage(messaging, (payload) => {
    console.log("Foreground message received:", payload);
    callback(payload);
  });
}
