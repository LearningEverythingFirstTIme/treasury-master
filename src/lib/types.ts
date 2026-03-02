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
  createdAt: Date;
}

export const DEFAULT_CATEGORIES = {
  income: ['Donation', 'Meeting Contributions', 'Fundraiser', 'Other Income'],
  expense: ['Rent', 'Literature', 'Coffee/Refreshments', 'Supplies', 'Group Activities', 'Other Expense']
};

export interface UserSettings {
  userId: string;
  reserveMonths: number;  // Default: 3 (AA suggests 2-3 months)
  updatedAt: Date;
}
