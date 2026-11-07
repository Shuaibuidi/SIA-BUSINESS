# Smart Business Manager — Admin & Worker upgrade (starter package)

## What is included
- `index.html`: new role-aware portal for Admin and Workers.
- `functions/`: trusted Firebase backend. Worker creation uses Firebase Admin SDK; sales and services are recorded by callable functions; stock is decremented atomically so two phones cannot oversell the same item.
- `firestore.rules`: workers can read stock and their own transactions, but cannot read Admin-only private documents or write/delete transactions directly.
- `legacy-index.html`: your uploaded original app, preserved unchanged so its existing local/cloud data is not overwritten by this upgrade.
- `firebase.json` and `.firebaserc.example`: Firebase deployment configuration.

## Important: do not distribute to workers until setup is complete
This package establishes a separate secure shared workspace. It does **not** automatically migrate the original app's existing stock, customers, invoices, expenses, salaries or historical records into the new workspace. Your old app is preserved as `legacy-index.html`; keep it owner-only while migration is planned. Do not use the old whole-database cloud sync for worker accounts.

## Firebase setup (owner account first)
1. Back up your existing app data using its Backup button and keep the JSON file safe.
2. Extract this ZIP into your GitHub repository root. Keep `legacy-index.html` and `index.html` in the same folder.
3. In Firebase Console for project `smart-business-manager-f319f`, enable **Authentication → Email/Password** and create a **Cloud Firestore** database.
4. Install Firebase CLI on a computer, sign in, then run these commands from the project folder:
   ```sh
   npm install -g firebase-tools
   firebase login
   firebase use smart-business-manager-f319f
   cd functions && npm install && cd ..
   firebase deploy --only firestore:rules,functions
   ```
   Cloud Functions deployment generally requires the Firebase project to be on the **Blaze (pay-as-you-go)** plan with billing enabled. Review Firebase pricing and set budget alerts before enabling billing.
5. Publish the new `index.html` to a Firebase Hosting site or package it into your Android WebView project. The Firebase project ID and web config are already included from the uploaded app.
6. Open the new app, choose **Create owner account**, then sign in and complete **Set up as Admin**. Do this yourself before giving the app to workers. The first successful business claim creates the Admin membership for that signed-in account.
7. As Admin, add stock items with their available quantity and selling price. Then create worker accounts with a unique email and temporary password. Give each worker their own credentials privately.
8. Workers sign in on their own phones. They can record sales and services, print/save receipts, and see their own transactions. The Admin can see all transactions and manage stock and worker accounts.

## Security model
- Worker account creation happens on the server using Firebase Admin SDK. No Admin SDK private key is embedded in the app.
- Worker identity is taken from Firebase Authentication; the client cannot choose another worker's UID/name when recording a sale.
- Sales run inside a Firestore transaction that checks available quantity and decrements stock atomically.
- Firestore rules block client-side transaction writes, worker edits/deletes, and access to the `private` collection.
- Existing `users/{uid}/appData/main` backup documents remain restricted to that same signed-in account. The new worker portal does not read them.

## Current scope and next integration work
The role-based shared portal currently supports worker accounts, stock visibility, product/spare-part sales, printing/repair service entries, customer contact details, receipts, Admin transaction visibility and stock updates. It is a secure new operational workspace, not yet a complete merge of all the original app's features. In particular, historical invoice migration, full customer management, expense vouchers, payroll, purchase costs, profit calculations, worker record correction by Admin, offline queued writes and full APK packaging still need to be integrated and tested against your live Firebase database. Do not assume these are already migrated.
