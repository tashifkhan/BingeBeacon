// ============================================================
// BingeBeacon — Web Push Subscription
// Subscribes the browser to push notifications and registers
// the subscription endpoint with the Go backend.
// ============================================================

import { api } from "./api";

/**
 * Subscribe to web push notifications.
 * Registers the subscription with the backend as a device.
 */
export async function subscribeToPush(): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.warn("Push notifications not supported in this browser.");
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    // Check if already subscribed
    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      console.info("Already subscribed to push notifications.");
      return true;
    }

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      console.warn("VAPID public key not configured.");
      return false;
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });

    // Register with backend
    await api.post("/me/devices", {
      device_token: JSON.stringify(subscription),
      platform: "web",
    });

    return true;
  } catch (error) {
    console.error("Failed to subscribe to push:", error);
    return false;
  }
}

/**
 * Unsubscribe from push notifications.
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!("serviceWorker" in navigator)) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
    }
    return true;
  } catch (error) {
    console.error("Failed to unsubscribe from push:", error);
    return false;
  }
}

/**
 * Convert a VAPID URL-safe base64 key to a Uint8Array.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
