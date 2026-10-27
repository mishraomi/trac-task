# Production deployment

The production site is `https://trac.lazytechie.in`. GitHub Actions deploys only after a push to `prod` or a manual run of **Deploy production site**.

## One-time Hostinger setup

1. In hPanel for `trac.lazytechie.in`, enable Remote Access/SFTP.
2. Create a deployment-only FTP/SFTP account restricted to the website directory, normally `/home/<hosting-user>/domains/trac.lazytechie.in/public_html`.
3. Record the SFTP host, port, username, and remote directory from hPanel. Do not use a broad hosting-account credential.
4. Copy the ED25519 host-key fingerprint shown in hPanel. The workflow checks this fingerprint before deploying, so it never accepts an unverified SFTP server.

## GitHub production environment

Create a GitHub Environment named `production`, then add these environment secrets:

| Secret                              | Value                                      |
| ----------------------------------- | ------------------------------------------ |
| `HOSTINGER_SFTP_HOST`               | Hostinger SFTP host or IP                  |
| `HOSTINGER_SFTP_PORT`               | SFTP port shown in hPanel                  |
| `HOSTINGER_SFTP_USERNAME`           | Restricted deployment account username     |
| `HOSTINGER_SFTP_PASSWORD`           | Restricted deployment account password     |
| `HOSTINGER_REMOTE_DIR`              | Restricted account's website document root |
| `HOSTINGER_SSH_FINGERPRINT`         | ED25519 host-key fingerprint from hPanel   |
| `VITE_FIREBASE_API_KEY`             | Firebase web configuration value           |
| `VITE_FIREBASE_AUTH_DOMAIN`         | Firebase web configuration value           |
| `VITE_FIREBASE_PROJECT_ID`          | Firebase web configuration value           |
| `VITE_FIREBASE_STORAGE_BUCKET`      | Firebase web configuration value           |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase web configuration value           |
| `VITE_FIREBASE_APP_ID`              | Firebase web configuration value           |
| `VITE_FIREBASE_MEASUREMENT_ID`      | Firebase web configuration value, if used  |

The `VITE_*` values are compiled into the browser bundle, so Firebase security must rely on Authentication, Firestore rules, and authorized domains rather than the secrecy of those values.

## Firebase before first release

In Firebase Authentication, add `trac.lazytechie.in` to **Authorized domains**. Confirm that Email/Password and Google providers are enabled, then test both authentication paths plus Firestore read/write access on the deployed site.

## Release and rollback

- Push the approved source to `prod` to release it. Pushes to `dev` never trigger this workflow.
- The upload mirrors `dist/` with `--delete`; it intentionally removes old deployed assets. Confirm the target directory is limited to this app before the first run.
- To roll back, revert the production commit or push a known-good commit to `prod`; the workflow will redeploy that version.
