# Jim's Treasury Tracker - Technical Documentation

## Overview

Jim's Treasury Tracker is a web application designed for Alcoholics Anonymous group treasurers to manage group finances. Built with SvelteKit, TypeScript, Tailwind CSS, and Firebase.

## Architecture

### Tech Stack
| Layer | Technology | Purpose |
|-------|------------|---------|
| Framework | SvelteKit 2.x | Full-stack web framework |
| Language | TypeScript | Type-safe development |
| Styling | Tailwind CSS v4 | Utility-first CSS |
| Auth | Firebase Auth | Email/password authentication |
| Database | Cloud Firestore | NoSQL document database |
| Hosting | Vercel | Serverless deployment |

### Data Flow
1. **Authentication** - User signs in via Firebase Auth
2. **Treasury Selection** - User selects/creates a treasury
3. **Transaction Management** - Add/view/delete transactions

## Firebase Schema

### treasuries collection
| Field | Type | Description |
|-------|------|-------------|
| userId | string | Firebase Auth UID |
| name | string | Treasury display name |
| description | string | Optional description |
| categories | string[] | Custom category names |
| createdAt | timestamp | Creation timestamp |

### transactions collection
| Field | Type | Description |
|-------|------|-------------|
| userId | string | Firebase Auth UID |
| treasuryId | string | Parent treasury ID |
| amount | number | Transaction amount |
| type | 'income' \| 'expense' | Transaction type |
| category | string | Category name |
| note | string | Optional note |
| date | timestamp | Transaction date |
| createdAt | timestamp | Creation timestamp |

## TypeScript Types

```typescript
interface Transaction {
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

interface Treasury {
  id: string;
  userId: string;
  name: string;
  description: string;
  categories: string[];
  createdAt: Date;
}

const DEFAULT_CATEGORIES = {
  income: ['Donation', 'Meeting Contributions', 'Fundraiser', 'Other Income'],
  expense: ['Rent', 'Literature', 'Coffee/Refreshments', 'Supplies', 'Group Activities', 'Other Expense']
};
```

## File Structure

```
src/
├── routes/
│   ├── +page.svelte           # Treasury list page
│   ├── login/+page.svelte     # Login page
│   └── treasury/[id]/+page.svelte  # Treasury detail page
├── lib/
│   ├── firebase.ts            # Firebase initialization
│   ├── auth.ts                # Auth store and functions
│   ├── treasury.ts            # Treasury data functions
│   └── types.ts               # TypeScript types
├── app.css                    # Global styles
└── app.html                   # HTML template
```

## Key Functions

### treasury.ts
- `createTreasury(userId, name, description)` - Create new treasury
- `getUserTreasuries(userId)` - Get all user treasuries
- `addTransaction(...)` - Add transaction to treasury
- `getTreasuryTransactions(treasuryId)` - Get treasury transactions
- `calculateBalance(transactions)` - Calculate total balance
- `getCategoryBreakdown(transactions)` - Get spending by category
- `addCategory(treasuryId, category)` - Add custom category
- `removeCategory(treasuryId, category)` - Remove custom category

## Pages

### / (Home)
- Lists all user treasuries
- Create new treasury modal
- Navigation to treasury detail

### /login
- Email/password authentication
- Sign up / Sign in toggle
- Redirect to home on success

### /treasury/[id]
- Treasury detail view
- Balance display
- Add transaction modal
- Transaction list
- Category management modal
- Category breakdown

## Known Issues

1. **Modal hang on create** - After creating a treasury, the modal sometimes doesn't close properly
2. **SSR Firebase initialization** - Firebase must only initialize in browser context
3. **Tailwind v4 configuration** - Custom colors require proper @theme directive

## Required Firestore Indexes

```json
{
  "indexes": [
    {
      "collectionGroup": "treasuries",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "transactions",
      "fields": [
        { "fieldPath": "treasuryId", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "DESCENDING" }
      ]
    }
  ]
}
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| VITE_FIREBASE_API_KEY | Firebase API key |
| VITE_FIREBASE_AUTH_DOMAIN | Auth domain |
| VITE_FIREBASE_PROJECT_ID | Project ID |
| VITE_FIREBASE_STORAGE_BUCKET | Storage bucket |
| VITE_FIREBASE_MESSAGING_SENDER_ID | Sender ID |
| VITE_FIREBASE_APP_ID | App ID |

## Future Improvements

- Export to CSV/PDF
- Recurring transactions
- Multiple user roles
- Audit log
- Budget planning
- Date range filtering
- Search transactions
