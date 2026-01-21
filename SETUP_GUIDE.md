# Quick Setup Guide - Al Huzaifa Digital

## ✅ What's Been Completed

### Step 1: Firebase Configuration & Schema ✅
- **File**: `lib/firebase.js`
  - Firebase Web SDK configuration
  - Firestore with IndexedDB offline persistence enabled
  - Storage and Auth initialized
  
- **File**: `docs/FIRESTORE_SCHEMA.md`
  - Complete database schema documentation
  - All collections defined (Bills, Workers, FavouriteCustomers, Samples, Profits)
  - Relational links explained
  - Security rules template
  - Required indexes listed

### Step 2: Zustand Global Store ✅
- **File**: `store/billingStore.js`
  - High-performance state management
  - Auto-calculation of VAT (5%) per item
  - Automatic total calculations
  - Item management (add, remove, update)
  - Worker assignment tracking
  - Status toggles (Delivered, Full Payment)
  - Optimized for 50+ items without lag

### Step 3: Bill Creation Page ✅
- **File**: `components/BillCreationPage.tsx`
  - Complete bill creation form
  - Customer information fields
  - Dynamic items (unlimited)
  - Automatic VAT calculation (5%)
  - Accurate final calculations
  - Status checkboxes
  - Item-level actions (Ready, Assign Worker)
  - WhatsApp integration
  - Firestore save functionality

## 🚀 Next Steps to Run

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Firebase

**Option A: Using Environment Variables (Recommended)**
1. Create `.env.local` file in root directory
2. Copy values from `.env.example` (if it exists) or add:
```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=al-huzaifa-db.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=al-huzaifa-db
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=al-huzaifa-db.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

**Option B: Direct Configuration**
1. Open `lib/firebase.js`
2. Replace placeholder values with your Firebase Web SDK config
3. Get config from: Firebase Console > Project Settings > General > Your apps > Web app

### 3. Set Up Firestore

1. Go to Firebase Console > Firestore Database
2. Create the indexes listed in `docs/FIRESTORE_SCHEMA.md`
3. Update Security Rules (see schema doc)

### 4. Run the App

```bash
npm run dev
```

Visit: http://localhost:3000

## 📱 Testing the Bill Creation

1. Navigate to `/bills` page
2. Fill in customer information
3. Add items with rates
4. Verify VAT is calculated automatically (5%)
5. Check calculations are accurate
6. Click "Save Bill" - should save to Firestore and open WhatsApp

## 🔧 Project Structure

```
├── app/
│   ├── bills/page.tsx          # Bill creation page
│   ├── dashboard/page.tsx       # Dashboard (placeholder)
│   ├── favourite/page.tsx       # Favourite customers (placeholder)
│   ├── workers/page.tsx         # Worker management (placeholder)
│   ├── samples/page.tsx         # Samples gallery (placeholder)
│   ├── layout.tsx               # Root layout
│   └── globals.css              # Global styles
├── components/
│   ├── BillCreationPage.tsx     # Main bill creation component
│   └── Layout.tsx                # Layout with navigation
├── lib/
│   └── firebase.js              # Firebase configuration
├── store/
│   └── billingStore.js          # Zustand state management
└── docs/
    └── FIRESTORE_SCHEMA.md      # Database schema
```

## ⚠️ Important Notes

1. **Firebase Keys**: You MUST provide your Firebase Web SDK keys (not the service account key from `firebase_key.json`)
2. **Offline Persistence**: Enabled automatically via IndexedDB
3. **Bill Numbers**: Currently auto-generated as `BILL-YYYY-NNN` (can be enhanced with counter collection)
4. **WhatsApp Links**: Generated automatically on save/ready

## 🐛 Troubleshooting

**"Firebase: Error (auth/invalid-api-key)"**
- Check your Firebase config in `lib/firebase.js` or `.env.local`
- Ensure you're using Web SDK keys, not service account keys

**"Persistence failed: Multiple tabs open"**
- This is normal - only one tab can have persistence enabled
- The app will still work, just without offline sync in other tabs

**Calculations not updating**
- Check browser console for errors
- Ensure all item rates are valid numbers

## 📞 Support

Refer to `README.md` for complete documentation.
