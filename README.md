# Jim's Treasury Tracker

A simple, mobile-first treasury management app for AA group treasurers. Built for Jim, Nick's AA sponsor, to manage finances for two AA groups: Matt Talbot Retreat and Sunday Night meetings.

## Features

- 🔐 **Email/Password Authentication** - Secure, isolated user data
- 📱 **Mobile-First Design** - Large touch targets, easy to use on phone
- 💰 **Two Separate Treasuries** - No combined dashboard, keep groups separate
- ⚡ **Quick Transaction Add** - Amount, type, category, note
- 📊 **Current Balance** - Prominently displayed
- 📋 **Recent Transactions** - List with delete option
- 📈 **Category Breakdown** - Visual breakdown by category
- 🏷️ **Custom Categories** - Per-treasury custom categories
- 🌿 **Warm Design** - Encouraging, peaceful aesthetic

## Tech Stack

- **Framework:** SvelteKit
- **Auth & Database:** Firebase (Auth + Firestore)
- **Styling:** Tailwind CSS
- **Deployment:** Vercel

## Firebase Setup

1. Create a new Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Email/Password** authentication in Authentication > Sign-in method
3. Create a **Cloud Firestore** database in test mode (or set up security rules)
4. Get your Firebase config from Project Settings > General > Your apps
5. Copy `.env.example` to `.env` and fill in your Firebase credentials

## Local Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Firebase credentials

# Start development server
npm run dev
```

## Environment Variables

Create a `.env` file with your Firebase configuration:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

## Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /treasuries/{treasuryId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
    match /transactions/{transactionId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
  }
}
```

## Deployment

### Vercel

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

```bash
# Or deploy via CLI
vercel
```

## Usage

1. **Sign up** with email and password
2. **Create treasuries** for each AA group (e.g., "Matt Talbot", "Sunday Night")
3. **Add transactions** quickly with the + button
4. **View balance** prominently at the top of each treasury
5. **See breakdown** by category
6. **Manage custom categories** per treasury via the settings (⚙️) button

## Default Categories

**Income:** Donation, Meeting Contributions, Fundraiser, Other Income

**Expense:** Rent, Literature, Coffee/Refreshments, Supplies, Group Activities, Other Expense

Add custom categories per treasury as needed!

---

Built with 💚 for the AA community
