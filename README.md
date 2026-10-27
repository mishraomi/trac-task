# Trac

Trac is a responsive collaborative task-list application. It provides a focused place to create todo lists, track task progress, and share lists with other Trac users.

**Production:** [trac.lazytechie.in](https://trac.lazytechie.in)

## Features

- Email/password registration and sign-in
- Google sign-in with Firebase Authentication
- Private todo lists with descriptions and completion progress
- Task creation, editing, deletion, status, priority, and due dates
- Real-time list and task updates through Cloud Firestore
- List sharing with existing Trac users
- Per-member read-only or edit access
- Owner-controlled membership, list settings, and deletion
- Responsive desktop and mobile interface

## Tech stack

- [React 18](https://react.dev/) and [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/) for local development and production builds
- [Firebase Authentication](https://firebase.google.com/docs/auth) and [Cloud Firestore](https://firebase.google.com/docs/firestore)
- [Lucide](https://lucide.dev/) icons
- GitHub Actions + Hostinger SFTP for production deployment

## Getting started

### Prerequisites

- Node.js 20 or later
- npm
- A Firebase project with Authentication and Cloud Firestore enabled

### Install and run locally

```bash
git clone https://github.com/mishraomi/trac-task.git
cd trac-task
npm ci
```

Create a local environment file from the example:

```bash
copy .env.example .env.local
```

On macOS or Linux, use `cp .env.example .env.local` instead. Fill in the Firebase web-app values, then start Vite:

```bash
npm run dev
```

Open the local address printed by Vite, usually `http://localhost:5173`.

### Build for production

```bash
npm run build
```

Vite writes the static production site to `dist/`. Do not commit this directory; GitHub Actions generates and deploys it.

## Firebase configuration

Copy `.env.example` to `.env.local` and set these values from your Firebase project's web-app configuration:

```dotenv
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
```

Enable these Firebase products before using the app:

1. **Authentication** with Email/Password and Google providers.
2. **Cloud Firestore**.
3. The Firestore rules in [`firestore.rules`](./firestore.rules).

For production, add `trac.lazytechie.in` to Firebase Authentication's **Authorized domains**. `VITE_*` values are compiled into browser code, so Firebase security is enforced by Authentication, Firestore rules, and authorized domains—not by keeping these values secret.

## Data model and permissions

Firestore stores data in these collections:

```text
users/{userId}
lists/{listId}
lists/{listId}/tasks/{taskId}
```

Each list records its owner, member IDs, member roles, and member access level. The owner has full control. Members can read shared lists; members with `edit` access can create, change, and delete tasks. The Firestore rules enforce these permissions server-side.

## Deployment

Production deployments run automatically when changes are pushed to the `prod` branch. The workflow:

1. Installs dependencies with `npm ci`.
2. Builds the Vite bundle using GitHub environment secrets.
3. Verifies Hostinger's SFTP host key fingerprint.
4. Mirrors `dist/` to the restricted Hostinger document root.
5. Checks that `https://trac.lazytechie.in/` responds successfully.

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the required Hostinger setup, GitHub `production` environment secrets, Firebase production setup, and rollback procedure.

## Repository layout

```text
src/
  firebase.ts       Firebase initialization
  main.tsx          Application UI and Firestore interactions
  sharing.ts         List membership and permission helpers
  styles.css         Responsive application styles
public/assets/       Auth-screen artwork and static assets
firestore.rules      Firestore authorization rules
.github/workflows/   Production deployment workflow
```

## Security notes

- Never commit `.env.local`, SFTP credentials, or GitHub environment secrets.
- Keep Firebase Authentication authorized domains limited to domains you control.
- Review changes to `firestore.rules` carefully; they govern access to every list and task.
- The production deploy uses a restricted SFTP account and deletes obsolete files inside its configured remote directory. Keep that directory scoped to this application only.

## Contributing

1. Create a branch from `dev`.
2. Make and locally test your change.
3. Open a pull request into `dev`.
4. Promote approved changes from `dev` to `prod` to trigger a production deployment.
