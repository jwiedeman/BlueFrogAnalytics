import { initializeApp } from 'firebase/app';
import { getAnalytics, type Analytics } from 'firebase/analytics';
import { getAuth, onAuthStateChanged, type Auth } from 'firebase/auth';

let auth: Auth | null = null;
let analytics: Analytics | null = null;

export function initFirebase() {
  if (auth) return auth;
  const config = {
    apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY,
    authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.PUBLIC_FIREBASE_APP_ID,
    measurementId: import.meta.env.PUBLIC_FIREBASE_MEASUREMENT_ID,
  };
  const app = initializeApp(config);
  auth = getAuth(app);
  try {
    analytics = getAnalytics(app);
    (window as any).firebaseAnalytics = analytics;
  } catch {
    // Analytics not available in non-browser environments
  }
  (window as any).firebaseAuth = auth;
  (window as any).onAuthStateChanged = onAuthStateChanged;
  onAuthStateChanged(auth, user => {
    localStorage.setItem('bfaLoggedIn', user ? 'true' : 'false');
  });
  document.dispatchEvent(new Event('firebase-init'));
  return auth;
}

export function getFirebaseAuth() {
  return auth;
}

export function getFirebaseAnalytics() {
  return analytics;
}
