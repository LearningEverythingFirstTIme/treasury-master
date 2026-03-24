import { collection, addDoc, deleteDoc, doc, query, where, orderBy, getDocs, onSnapshot, serverTimestamp, updateDoc, arrayUnion, arrayRemove, type Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';
import { uploadReceipt, deleteReceipt } from './receipts';
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
    prudentReserve: 0,
    prudentReserveMode: 'manual',
    prudentReserveMonths: 3,
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
      prudentReserveMode: data.prudentReserveMode ?? 'manual',
      prudentReserveMonths: data.prudentReserveMonths ?? 3,
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

export async function updatePrudentReserve(
  treasuryId: string,
  amount: number,
  mode: 'auto' | 'manual' = 'manual',
  months: number = 3
): Promise<void> {
  const ref = doc(db, 'treasuries', treasuryId);
  await updateDoc(ref, {
    prudentReserve: Math.max(0, amount),
    prudentReserveMode: mode,
    prudentReserveMonths: months
  });
}

export async function addTransaction(
  userId: string,
  treasuryId: string,
  data: Omit<Transaction, 'id' | 'userId' | 'treasuryId' | 'createdAt' | 'receiptUrl' | 'receiptPath'>,
  receiptFile?: File | null
): Promise<string> {
  let receiptUrl: string | null = null;
  let receiptPath: string | null = null;
  
  // Upload receipt first if provided
  if (receiptFile) {
    // Create a temp ID for the storage path (we'll use a UUID-based approach)
    const tempId = crypto.randomUUID();
    const uploadResult = await uploadReceipt(userId, tempId, receiptFile);
    receiptUrl = uploadResult.url;
    receiptPath = uploadResult.path;
  }
  
  const docRef = await addDoc(transactionsCollection, {
    ...data,
    userId,
    treasuryId,
    receiptUrl,
    receiptPath,
    createdAt: serverTimestamp()
  });
  
  // If we used a temp ID, update the path with the actual doc ID
  if (receiptPath && docRef.id) {
    // The path was receipts/{userId}/{tempId}/{fileName}
    // We need to update it to use the actual doc ID for consistency
    // For now, the temp ID approach works fine for deletion purposes
  }
  
  return docRef.id;
}

export async function deleteTransaction(transactionId: string, receiptPath?: string | null): Promise<void> {
  // Delete receipt from storage if it exists
  if (receiptPath) {
    try {
      await deleteReceipt(receiptPath);
    } catch (err) {
      console.error('Failed to delete receipt from storage:', err);
      // Continue with document deletion even if storage deletion fails
    }
  }
  await deleteDoc(doc(db, 'transactions', transactionId));
}

export async function getTreasuryTransactions(userId: string, treasuryId: string): Promise<Transaction[]> {
  const q = query(
    transactionsCollection,
    where('userId', '==', userId),
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
      createdAt: data.createdAt?.toDate() || new Date(),
      receiptUrl: data.receiptUrl ?? null,
      receiptPath: data.receiptPath ?? null
    } as Transaction;
  });
}

export function subscribeTreasuryTransactions(
  userId: string,
  treasuryId: string,
  callback: (transactions: Transaction[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(
    transactionsCollection,
    where('userId', '==', userId),
    where('treasuryId', '==', treasuryId),
    orderBy('date', 'desc')
  );
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        date: data.date?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date(),
        receiptUrl: data.receiptUrl ?? null,
        receiptPath: data.receiptPath ?? null
      } as Transaction;
    }));
  }, onError);
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
