# S I A BUSINESS upgrade audit

This is a safe working branch for the Admin/Worker upgrade:
`codex/sia-business-secure-admin-worker`. The live `main` branch has not been changed.

## Repository findings

- The default branch is `main`.
- The repository contains both `index.html` and `Index.html`; these are different files on case-sensitive hosting. This branch changes the lowercase `index.html`.
- The original `firebase.json` referenced a missing `functions/` directory. This branch removes that Cloud Functions deploy target and configures Firestore rules plus Firebase Hosting.
- The legacy app stores an owner cloud backup at `users/{uid}/appData/{docId}`. Rules keep that path readable/writable only by its owning signed-in account.
- The previous single-payload model cannot be shared with workers because Firestore rules cannot hide selected fields inside one shared document.
- Sensitive information includes buying costs, expenses, purchases, payroll/salary, profit, private settings and worker identity details.

## Changes made on this branch

- Removed public worker self-registration.
- Added Admin-only worker account creation using a secondary Firebase Auth instance, so the Admin's main session is not replaced.
- Added Admin activate/deactivate controls for worker logins.
- Restricted stock and spare-part master documents and private cost snapshots to Admin.
- Added a worker-safe catalogue with item name, quantity and selling price only.
- Added paired Firestore transaction checks so a worker sale must create a matching sale record and decrement both the worker catalogue and master inventory quantities.
- Worker sales, services, repair jobs and invoices are restricted to the worker who created them; workers cannot delete or edit transaction records.
- Expenses, purchases, cashbook, suppliers, worker profiles and private cost snapshots are Admin-only.
- Kept the owner-only legacy backup path unchanged.
- Removed the Cloud Functions deployment target to keep the intended Firebase Spark setup free of Functions/Blaze dependencies.

## Safety and release status

- No live `main` branch files have been changed.
- No Firestore rules or Hosting deployment has been performed from this branch.
- No existing records or worker accounts have been migrated or deleted.
- Rules still require Emulator/Rules Playground testing with separate Admin and Worker accounts.
- Offline queued writes, deliberate legacy migration, and APK/device testing remain incomplete.
- Do not merge or distribute until tests pass.
