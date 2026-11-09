# S I A BUSINESS — Firebase Spark setup

This is an in-progress Admin/Worker upgrade. It is kept on the branch
`codex/sia-business-secure-admin-worker`; the live `main` branch has not been changed.

## What this branch changes

- Removes public worker self-registration from the login screen.
- Adds Admin-only worker account creation using a second Firebase Authentication instance, so creating a worker does not sign the Admin out.
- Adds Admin controls to activate or deactivate a worker login.
- Keeps buying prices, cost snapshots, expenses, purchases, cashbook, worker salary and National ID records Admin-only.
- Publishes a separate worker catalogue containing only item name, quantity and selling price.
- Records worker sales against the published catalogue and decrements both the published quantity and the Admin inventory quantity in one Firestore transaction.
- Workers can see only their own sales, repair jobs, services and invoices. They cannot delete transactions or edit stock.
- Keeps the existing owner-only `users/{uid}/appData/{docId}` backup path restricted to its account.

## Before enabling this version

1. Download a full backup from the currently working app and keep it somewhere safe.
2. In Firebase Console, open project `smart-business-manager-f319f`.
3. Confirm Authentication → Sign-in method → Email/Password is enabled.
4. Confirm Cloud Firestore is already created.
5. Do not migrate old records automatically. This branch uses a separate worker-safe catalogue and does not import old records into it.

## Deploy Firestore rules and Hosting (Spark-compatible)

This branch does not deploy Cloud Functions. It uses Firebase Authentication, Cloud Firestore and Firebase Hosting only.

From a computer with Node.js installed:

```sh
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules,hosting --project smart-business-manager-f319f
```

The root `firebase.json` is configured to deploy `firestore.rules` and host the root folder. Review the Firebase Console changes before confirming any deployment.

## First Admin sign-in after deployment

- Sign in using the existing Admin account that already has an active `businesses/7RqIYO3IDSVCYex1LsDo6rDw5V33/members/{your-uid}` record with `role: "admin"` and `active: true`.
- Open Workers and create a worker account. Use a unique email and a temporary password of at least 8 characters. Share the password privately.
- Open Stock and Spare parts. The app republishes the worker catalogue when an item is saved or a purchase is recorded. The Publish button can also refresh it.
- Give workers their own login credentials. They should never use the Admin login.

## Important limitations — not ready for production yet

- The Firestore rules have not yet been run through the Firebase Emulator or Rules Playground. Test Admin and Worker access before using real worker accounts.
- Offline queued writes and the full legacy-data migration have not been implemented in this branch.
- Existing legacy records remain untouched; the worker catalogue is separate until a deliberate migration is designed and tested.
- APK packaging and phone testing remain outstanding.
- Do not merge this branch into `main` or distribute it to workers until those checks pass.
