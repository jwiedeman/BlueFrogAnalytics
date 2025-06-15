import { useEffect } from 'react';
import { getFirebaseAuth, initFirebase } from '@/lib/firebase';

export default function ProtectedRoute() {
  useEffect(() => {
    const ensureAuth = () => {
      const auth = getFirebaseAuth() || initFirebase();
      return (window as any).onAuthStateChanged(auth, (user: any) => {
        if (!user) window.location.href = '/login';
      });
    };
    let unsub: any;
    if ((window as any).firebaseAuth) {
      unsub = ensureAuth();
    } else {
      const handler = () => {
        unsub = ensureAuth();
      };
      document.addEventListener('firebase-init', handler, { once: true });
      return () => document.removeEventListener('firebase-init', handler);
    }
    return () => { if (typeof unsub === 'function') unsub(); };
  }, []);
  return null;
}
