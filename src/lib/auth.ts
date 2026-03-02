import { writable } from 'svelte/store';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { auth } from './firebase';

export const user = writable<User | null>(null);
export const loading = writable(true);

onAuthStateChanged(auth, (u) => {
  user.set(u);
  loading.set(false);
});

export async function login(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signup(email: string, password: string) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function logout() {
  return signOut(auth);
}
