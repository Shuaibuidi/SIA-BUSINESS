# S I A BUSINESS upgrade audit

This branch is the safe working branch for the Admin/Worker upgrade. The live `main` branch has not been changed.

## Repository findings (2026-11-09)

- Default branch: `main`.
- The repository contains both `index.html` and `Index.html` (different files on case-sensitive hosting).
- `firebase.json` points Cloud Functions at `functions/`, but the repository tree has no `functions/` directory. A root-level `index.js` exists instead.
- `firestore.rules` describes a `businesses/{businessId}/...` data model.
- The full offline-first app previously supplied by the owner stores its cloud backup at `users/{uid}/appData/main`, with the complete business database inside one `payload` field. That model cannot safely provide worker access: Firestore rules cannot hide selected fields inside a shared document.
- The existing full app includes sensitive owner data (buying costs, expenses, salary/payment records, profit, invoices, settings and worker records). Do not expose the complete owner payload to worker accounts.
- The current README describes a Cloud Functions workflow. The requested target is Spark-compatible and must not depend on Cloud Functions or Blaze billing.

## Non-negotiable data safety

- Do not delete, overwrite, or automatically migrate existing local records, existing `users/{uid}/appData/main` backups, or existing worker records/accounts.
- Keep the current live `main` branch untouched until the replacement is reviewed and tested.
- Do not merge legacy and new business data automatically.
- Keep an explicit owner-only legacy backup path. Any future migration must be opt-in, backed up, and separately verified.

## Upgrade direction

Build a matching client and Firestore rules model for Firebase Spark:
- Email/password authentication.
- Owner/admin membership established only for the configured owner UID; worker membership must be explicitly granted by the owner.
- Separate Firestore documents/collections for worker-visible operational data and owner-only financial/private data. Never store the whole business database in one worker-readable document.
- Workers may create only their own permitted operational records; they must not read buying costs, expenses, payroll, profit, private settings, or other workers' private records.
- Admin-only writes for stock, staff, prices/costs, expenses, payroll, and corrections.
- Offline local records remain on-device and are not silently uploaded into the new shared workspace.

## Before merging

Test rules with the Firebase Emulator or Rules Playground, verify owner and worker access separately, and confirm the legacy backup path remains readable by its owning account only. Do not deploy rules or replace the live app until those checks pass.
