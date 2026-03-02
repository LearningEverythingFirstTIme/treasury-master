import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { Transaction, UserSettings } from './types';

export type { UserSettings };

const DEFAULT_RESERVE_MONTHS = 3;

// In-memory cache for settings to avoid unnecessary Firestore reads
const settingsCache: Map<string, UserSettings> = new Map();

export async function getUserSettings(userId: string): Promise<UserSettings> {
  // Return cached settings if available
  if (settingsCache.has(userId)) {
    return settingsCache.get(userId)!;
  }
  
  try {
    const ref = doc(db, 'settings', userId);
    const snap = await getDoc(ref);
    
    if (snap.exists()) {
      const data = snap.data();
      const settings = {
        userId,
        reserveMonths: data.reserveMonths ?? DEFAULT_RESERVE_MONTHS,
        updatedAt: data.updatedAt?.toDate() || new Date()
      };
      settingsCache.set(userId, settings);
      return settings;
    }
  } catch (err) {
    // Silently fail and return defaults - don't block the UI
    console.log('Settings read failed, using defaults:', err);
  }
  
  // Return defaults if no settings exist or read failed
  const defaults = {
    userId,
    reserveMonths: DEFAULT_RESERVE_MONTHS,
    updatedAt: new Date()
  };
  settingsCache.set(userId, defaults);
  return defaults;
}

export async function updateReserveMonths(userId: string, months: number): Promise<void> {
  const ref = doc(db, 'settings', userId);
  const settings = {
    userId,
    reserveMonths: Math.max(1, Math.min(12, months)),
    updatedAt: serverTimestamp()
  };
  
  try {
    await setDoc(ref, settings, { merge: true });
    settingsCache.set(userId, {
      userId,
      reserveMonths: settings.reserveMonths,
      updatedAt: new Date()
    });
  } catch (err) {
    console.error('Failed to save settings:', err);
    throw err;
  }
}

// Calculate the auto reserve target from recent transaction history.
// Uses last 3 months of expenses as the burn rate, multiplied by `months`.
export function calculateAutoReserveTarget(
  transactions: Transaction[],
  months: number
): { monthlyBurn: number; target: number; hasEnoughData: boolean } {
  const now = new Date();
  const cutoff = new Date(now.getFullYear(), now.getMonth() - 3, 1);

  const recentExpenses = transactions.filter(
    t => t.type === 'expense' && t.date >= cutoff
  );

  if (recentExpenses.length === 0) {
    return { monthlyBurn: 0, target: 0, hasEnoughData: false };
  }

  const totalRecent = recentExpenses.reduce((sum, t) => sum + t.amount, 0);
  const monthlyBurn = totalRecent / 3;
  const target = monthlyBurn * months;

  return { monthlyBurn, target, hasEnoughData: true };
}

// Simple reserve status calculation based on dollar amounts
export function calculateReserveStatus(
  currentBalance: number,
  targetReserve: number
): {
  targetReserve: number;
  currentReserve: number;
  percentCovered: number;
  status: 'healthy' | 'caution' | 'low' | 'unset';
  surplus: number;
} {
  // If no target set (0), show unset status
  if (targetReserve <= 0) {
    return {
      targetReserve: 0,
      currentReserve: currentBalance,
      percentCovered: 0,
      status: 'unset',
      surplus: currentBalance
    };
  }
  
  const percentCovered = Math.min(100, (currentBalance / targetReserve) * 100);
  const surplus = currentBalance - targetReserve;
  
  let status: 'healthy' | 'caution' | 'low' | 'unset';
  if (currentBalance >= targetReserve) {
    status = 'healthy';
  } else if (currentBalance >= targetReserve * 0.5) {
    status = 'caution';
  } else {
    status = 'low';
  }
  
  return {
    targetReserve,
    currentReserve: currentBalance,
    percentCovered,
    status,
    surplus
  };
}