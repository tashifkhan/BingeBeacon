// ============================================================
// BingeBeacon — Firebase Cloud Messaging (FCM) Setup
// Initializes Firebase for the client and handles FCM tokens.
// ============================================================

import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, onMessage, type MessagePayload } from "firebase/messaging";
import { api } from "./api";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
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
	let serviceWorkerRegistration = await navigator.serviceWorker.getRegistration();
	if (!serviceWorkerRegistration) {
	  serviceWorkerRegistration = await navigator.serviceWorker.register("/sw.js");
	}
	const token = await getToken(messaging, {
	  vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
	  serviceWorkerRegistration,
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
export function onForegroundMessage(callback: (payload: MessagePayload) => void) {
  if (typeof window === "undefined") return;
  
  const messaging = getMessaging(app);
  return onMessage(messaging, (payload) => {
    console.log("Foreground message received:", payload);
    callback(payload);
  });
}
