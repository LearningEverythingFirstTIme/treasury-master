export interface Transaction {
  id: string;
  userId: string;
  treasuryId: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  note: string;
  date: Date;
  createdAt: Date;
}

export interface Treasury {
  id: string;
  userId: string;
  name: string;
  description: string;
  categories: string[];
  prudentReserve: number;                   // Stored target dollar amount
  prudentReserveMode: 'auto' | 'manual';    // How the target was set
  prudentReserveMonths: number;             // Months multiplier used in auto mode
  createdAt: Date;
}

export const DEFAULT_CATEGORIES = {
  income: ['Donation', 'Meeting Contributions', 'Fundraiser', 'Other Income'],
  expense: ['Rent', 'Literature', 'Coffee/Refreshments', 'Supplies', 'Group Activities', 'Other Expense']
};

// UserSettings kept for potential future use, but prudent reserve is now per-treasury
export interface UserSettings {
  userId: string;
  reserveMonths: number;
  updatedAt: Date;
}