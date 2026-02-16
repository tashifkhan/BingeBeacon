import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from '@next/env';
const { loadEnvConfig } = pkg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.resolve(rootDir, 'public');

// Load Next.js environment variables
loadEnvConfig(rootDir);

const envVars = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check if variables are missing
const missing = Object.entries(envVars).filter(([_, v]) => !v);
if (missing.length > 0) {
  console.warn('⚠️  Warning: Missing Firebase environment variables for Service Worker:', missing.map(([k]) => k).join(', '));
  console.warn('Service Worker will be generated with empty values. Notifications might not work in the background.');
}

const swContent = `/**
 * BingeBeacon — Firebase Messaging Service Worker
 * THIS FILE IS AUTO-GENERATED DURING BUILD. DO NOT EDIT MANUALLY.
 */
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "${envVars.apiKey || ''}",
  authDomain: "${envVars.authDomain || ''}",
  projectId: "${envVars.projectId || ''}",
  storageBucket: "${envVars.storageBucket || ''}",
  messagingSenderId: "${envVars.messagingSenderId || ''}",
  appId: "${envVars.appId || ''}"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification?.title || 'BingeBeacon';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/icons/icon-192.svg',
    badge: '/icons/icon-192.svg',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
`;

fs.writeFileSync(path.join(publicDir, 'firebase-messaging-sw.js'), swContent);
console.log('✅ Generated public/firebase-messaging-sw.js with current environment variables.');
