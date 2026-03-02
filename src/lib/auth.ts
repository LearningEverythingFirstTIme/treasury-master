import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import type { User } from 'firebase/auth';

export const user = writable<User | null>(null);
export const loading = writable(true);

// Only set up auth listener in the browser
if (browser) {
  // Dynamic import to avoid SSR issues
  const { onAuthStateChanged } = await import('firebase/auth');
  const { auth } = await import('./firebase');
  
  onAuthStateChanged(auth, (u) => {
    user.set(u);
    loading.set(false);
  });
} else {
  // Server: not loading, no user
  loading.set(false);
}

// Auth actions - only work in browser
export async function login(email: string, password: string) {
  if (!browser) throw new Error('Auth not available during SSR');
  const { signInWithEmailAndPassword } = await import('firebase/auth');
  const { auth } = await import('./firebase');
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signup(email: string, password: string) {
  if (!browser) throw new Error('Auth not available during SSR');
  const { createUserWithEmailAndPassword } = await import('firebase/auth');
  const { auth } = await import('./firebase');
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function logout() {
  if (!browser) throw new Error('Auth not available during SSR');
  const { signOut } = await import('firebase/auth');
  const { auth } = await import('./firebase');
  return signOut(auth);
}
