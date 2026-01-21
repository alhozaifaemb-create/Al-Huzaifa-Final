# Al Huzaifa Digital - Premium Tailoring PWA

A high-performance, offline-capable Progressive Web App (PWA) for premium tailoring business management in the UAE.

## 🚀 Features

- **Offline-First**: Works without internet using Firebase IndexedDB persistence
- **High Performance**: Handles 50+ items in lists without lag using Zustand state management
- **Modular Architecture**: Clean, separated components for easy updates
- **Mobile-First Design**: Professional UI with Tailwind CSS

## 📋 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **UI**: Tailwind CSS
- **Database**: Firebase Firestore & Storage
- **State Management**: Zustand
- **Icons**: Lucide React
- **Charts**: Recharts
- **PDF**: @react-pdf/renderer

## 🛠️ Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Firebase

1. Go to Firebase Console: https://console.firebase.google.com
2. Select your project: `al-huzaifa-db`
3. Go to Project Settings > General
4. Scroll to "Your apps" section
5. Click on the Web app icon (</>) or create a new web app
6. Copy the Firebase configuration object

### 3. Update Firebase Config

Open `lib/firebase.js` and replace the placeholder values:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",                    // Replace with your API key
  authDomain: "al-huzaifa-db.firebaseapp.com", // Usually correct
  projectId: "al-huzaifa-db",                 // Usually correct
  storageBucket: "al-huzaifa-db.appspot.com", // Usually correct
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID", // Replace
  appId: "YOUR_APP_ID",                       // Replace
  measurementId: "YOUR_MEASUREMENT_ID"        // Optional
};
```

### 4. Set Up Firestore Indexes

Go to Firebase Console > Firestore Database > Indexes and create the following composite indexes:

**Collection: `bills`**
- `deliveryDate` (Ascending)
- `status.delivered` (Ascending) + `deliveryDate` (Ascending)
- `customerName` (Ascending)
- `mobile` (Ascending)

**Collection: `workers`**
- `name` (Ascending)
- `createdAt` (Descending)

**Collection: `favouriteCustomers`**
- `customerName` (Ascending)
- `mobile` (Ascending)

### 5. Set Up Firestore Security Rules

Go to Firebase Console > Firestore Database > Rules and update:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /bills/{billId} {
      allow read, write: if request.auth != null;
    }
    match /workers/{workerId} {
      allow read, write: if request.auth != null;
    }
    match /favouriteCustomers/{customerId} {
      allow read, write: if request.auth != null;
    }
    match /samples/{sampleId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
├── app/                    # Next.js App Router
│   ├── dashboard/         # Home/Dashboard page
│   ├── bills/             # Bill creation and list
│   ├── favourite/         # Favourite customers
│   ├── workers/           # Worker management
│   ├── samples/           # Samples gallery
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── Layout.tsx         # Main layout with navigation
│   └── BillCreationPage.tsx # Bill creation component
├── lib/                   # Utilities
│   └── firebase.js        # Firebase configuration
├── store/                 # Zustand stores
│   └── billingStore.js    # Billing state management
└── docs/                  # Documentation
    └── FIRESTORE_SCHEMA.md # Database schema
```

## 📱 Features Implemented

### ✅ Step 1: Firebase Config & Schema
- Firebase configuration with offline persistence
- Complete Firestore data model documentation

### ✅ Step 2: Zustand Global Store
- Optimized billing state management
- Auto-calculation of VAT (5%) and totals
- Persistent storage for offline capability

### ✅ Step 3: Bill Creation Page
- Customer information form
- Dynamic items with unlimited additions
- Automatic VAT calculation (5% per item)
- Accurate final calculations
- Status checkboxes (Delivered, Full Payment)
- Item-level actions (Ready checkbox, Assign Worker)
- WhatsApp integration for notifications
- Save to Firestore

## 🔄 Next Steps

The following features are ready for implementation:

1. **Dashboard**: Profit charts, URGENT/UNDELIVERED filters, global search
2. **Favourite Customers**: Star functionality, measurements storage
3. **Worker Card**: Complete ledger system, PDF export
4. **Samples Gallery**: Image upload, WhatsApp bulk share

## 📝 Notes

- The app uses IndexedDB for offline persistence
- All calculations are performed client-side for speed
- WhatsApp links are generated automatically on save/ready
- Bill numbers are auto-generated in format: `BILL-YYYY-NNN`

## 🐛 Troubleshooting

**Firebase connection issues:**
- Verify your Firebase config in `lib/firebase.js`
- Check that Firestore is enabled in Firebase Console
- Ensure security rules allow read/write operations

**Offline persistence not working:**
- Check browser console for errors
- Ensure you're using a supported browser (Chrome, Firefox, Edge)
- Only one tab can have persistence enabled at a time

## 📄 License

Proprietary - Al Huzaifa Digital
