import { collection, addDoc, deleteDoc, doc, query, where, orderBy, getDocs, serverTimestamp, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from './firebase';
import type { Transaction, Treasury } from './types';

export type { Transaction, Treasury };

const treasuriesCollection = collection(db, 'treasuries');
const transactionsCollection = collection(db, 'transactions');

export async function createTreasury(userId: string, name: string, description: string): Promise<string> {
  const docRef = await addDoc(treasuriesCollection, {
    userId,
    name,
    description,
    categories: [],
    prudentReserve: 0, // Default: no target set
    createdAt: serverTimestamp()
  });
  return docRef.id;
}

export async function getUserTreasuries(userId: string): Promise<Treasury[]> {
  const q = query(treasuriesCollection, where('userId', '==', userId), orderBy('createdAt', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      prudentReserve: data.prudentReserve ?? 0,
      createdAt: data.createdAt?.toDate() || new Date()
    } as Treasury;
  });
}

export async function addCategory(treasuryId: string, category: string): Promise<void> {
  const ref = doc(db, 'treasuries', treasuryId);
  await updateDoc(ref, {
    categories: arrayUnion(category)
  });
}

export async function removeCategory(treasuryId: string, category: string): Promise<void> {
  const ref = doc(db, 'treasuries', treasuryId);
  await updateDoc(ref, {
    categories: arrayRemove(category)
  });
}

export async function updatePrudentReserve(treasuryId: string, amount: number): Promise<void> {
  const ref = doc(db, 'treasuries', treasuryId);
  await updateDoc(ref, {
    prudentReserve: Math.max(0, amount)
  });
}

export async function addTransaction(
  userId: string,
  treasuryId: string,
  data: Omit<Transaction, 'id' | 'userId' | 'treasuryId' | 'createdAt'>
): Promise<string> {
  const docRef = await addDoc(transactionsCollection, {
    ...data,
    userId,
    treasuryId,
    createdAt: serverTimestamp()
  });
  return docRef.id;
}

export async function deleteTransaction(transactionId: string): Promise<void> {
  await deleteDoc(doc(db, 'transactions', transactionId));
}

export async function getTreasuryTransactions(treasuryId: string): Promise<Transaction[]> {
  const q = query(
    transactionsCollection,
    where('treasuryId', '==', treasuryId),
    orderBy('date', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      date: data.date?.toDate() || new Date(),
      createdAt: data.createdAt?.toDate() || new Date()
    } as Transaction;
  });
}

export function calculateBalance(transactions: Transaction[]): number {
  return transactions.reduce((acc, t) => {
    return t.type === 'income' ? acc + t.amount : acc - t.amount;
  }, 0);
}

export function getCategoryBreakdown(transactions: Transaction[]): Record<string, { amount: number; count: number; type: 'income' | 'expense' }> {
  return transactions.reduce((acc, t) => {
    if (!acc[t.category]) {
      acc[t.category] = { amount: 0, count: 0, type: t.type };
    }
    acc[t.category].amount += t.amount;
    acc[t.category].count += 1;
    return acc;
  }, {} as Record<string, { amount: number; count: number; type: 'income' | 'expense' }>);
}
