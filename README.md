# S I A BUSINESS

Existing S I A BUSINESS app. Work on the security-upgrade branch before merging to `main`.

## Test Firebase project

The working branch is configured for the separate Firebase test project:

- Project ID: `sia-business-test`
- Firestore region: `africa-south1`
- Business document path: `businesses/7RqIYO3IDSVCYex1LsDo6rDw5V33`

The original/live Firebase project and `main` branch must remain unchanged until testing is complete.

## First Admin account setup

Admin provisioning is intentionally a one-time manual Firebase Console operation. Do not allow a person to register themselves as Admin from the app.

1. In Firebase Authentication, create the owner's Email/Password account.
2. Copy that account's Firebase Authentication UID.
3. In Firestore, create the document:
   `businesses/7RqIYO3IDSVCYex1LsDo6rDw5V33/members/{AUTH_UID}`
   Replace `{AUTH_UID}` with the exact UID copied in step 2.
4. Add these fields to the document:
   - `uid` — string — exact same Authentication UID
   - `email` — string — owner's sign-in email
   - `name` — string — owner's display name
   - `role` — string — `admin`
   - `active` — boolean — `true`
5. Sign in to the app using that account.

Creating the member document in the Firebase Console bypasses client Firestore rules by design. The deployed rules do not permit public self-registration or client-side creation of an Admin account. Once the Admin exists, the Admin can create worker accounts inside the app.

## Safety

- Do not deploy Firestore rules until they have been tested in the Firebase Rules Playground or Emulator Suite.
- Do not merge the working branch into `main` until login, Admin permissions, worker permissions, and data isolation have been tested in the separate test project.
- Never put service-account private keys in the web app.
