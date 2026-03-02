import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { UserSettings } from './types';

export type { UserSettings };

const DEFAULT_RESERVE_MONTHS = 3;

export async function getUserSettings(userId: string): Promise<UserSettings> {
  const ref = doc(db, 'settings', userId);
  const snap = await getDoc(ref);
  
  if (snap.exists()) {
    const data = snap.data();
    return {
      userId,
      reserveMonths: data.reserveMonths ?? DEFAULT_RESERVE_MONTHS,
      updatedAt: data.updatedAt?.toDate() || new Date()
    };
  }
  
  // Return defaults if no settings exist
  return {
    userId,
    reserveMonths: DEFAULT_RESERVE_MONTHS,
    updatedAt: new Date()
  };
}

export async function updateReserveMonths(userId: string, months: number): Promise<void> {
  const ref = doc(db, 'settings', userId);
  await setDoc(ref, {
    userId,
    reserveMonths: Math.max(1, Math.min(12, months)), // Clamp 1-12
    updatedAt: serverTimestamp()
  }, { merge: true });
}

export function calculateMonthlyBurnRate(transactions: { amount: number; type: 'income' | 'expense'; date: Date }[]): number {
  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
  
  const recentExpenses = transactions.filter(
    t => t.type === 'expense' && t.date >= threeMonthsAgo
  );
  
  if (recentExpenses.length === 0) return 0;
  
  const totalExpenses = recentExpenses.reduce((sum, t) => sum + t.amount, 0);
  return totalExpenses / 3; // Monthly average
}

export function calculateReserveStatus(
  currentBalance: number,
  monthlyBurnRate: number,
  reserveMonths: number
): {
  targetReserve: number;
  currentReserve: number;
  monthsCovered: number;
  percentCovered: number;
  status: 'healthy' | 'caution' | 'low';
} {
  const targetReserve = monthlyBurnRate * reserveMonths;
  const monthsCovered = monthlyBurnRate > 0 ? currentBalance / monthlyBurnRate : 0;
  const percentCovered = targetReserve > 0 ? Math.min(100, (currentBalance / targetReserve) * 100) : 100;
  
  let status: 'healthy' | 'caution' | 'low';
  if (monthsCovered >= reserveMonths) {
    status = 'healthy';
  } else if (monthsCovered >= reserveMonths * 0.5) {
    status = 'caution';
  } else {
    status = 'low';
  }
  
  return {
    targetReserve,
    currentReserve: currentBalance,
    monthsCovered,
    percentCovered,
    status
  };
}
