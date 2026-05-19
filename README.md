# Cart & Parking Tracker

A lightweight web app for staff to track shopping cart checkouts (30-minute alerts) and short-term parking permits (15-minute alerts).

## Features

- **Cart checkout** — Cart number, student ID, and phone with elapsed time and countdown
- **Parking permits** — License plate and phone with separate 15-minute limit
- **Overdue alerts** — On-screen notifications when limits are exceeded
- **Local mode** — Works offline in the browser via `localStorage` (no setup)
- **Synced mode** — Optional shared staff code syncs carts and parking across devices via Firestore

## Development

### Prerequisites

- Node.js 14+
- npm

### Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server with live reload |
| `npm run start` | Same server without auto-open |
| `npm run build` | No-op (static site) |
| `npm run preview` | Preview on port 4173 |

## Firebase setup (after project loss or first time)

The old Firestore project config was removed from the repo. Connect a new project in a few minutes:

### 1. Create a Firebase project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. **Add project** → name it (e.g. `cart-checkout-tracker`)
3. **Build → Firestore Database → Create database** (start in **test mode** for quick setup, or production mode and deploy rules below)

### 2. Register a web app

1. Project **Settings** (gear) → **Your apps** → **Web** (`</>`)
2. Copy the `firebaseConfig` object

### 3. Add config via environment variables (git-safe)

Credentials live in `.env`, which is **never committed**. `firebase-config.js` is generated locally and on deploy.

```bash
cp .env.example .env
```

Edit `.env` with values from the Firebase web app config:

```env
FIREBASE_API_KEY=...
FIREBASE_AUTH_DOMAIN=...
FIREBASE_PROJECT_ID=...
FIREBASE_STORAGE_BUCKET=...
FIREBASE_MESSAGING_SENDER_ID=...
FIREBASE_APP_ID=...
FIREBASE_MEASUREMENT_ID=   # optional
```

Run `npm run build` or `npm run dev` — both generate `firebase-config.js` from `.env`.

**Vercel:** Project → Settings → Environment Variables — add the same `FIREBASE_*` keys. The build step runs `npm run build` to generate the config file before deploy.

### 4. Firestore rules

Deploy the included rules for the `locations` collection (or paste them in the Firebase Console → Firestore → Rules):

```bash
firebase deploy --only firestore:rules
```

Or copy from `firestore.rules` in this repo. Each **staff code** is a document ID under `locations/{staffCode}` with `carts` and `parkingPermits` arrays.

### 5. Use synced mode in the app

1. Open the app → **Carts** view
2. Enter a shared **staff code** (e.g. `front-desk`) — lowercase, no spaces
3. Click **Connect**
4. Other devices using the same code see the same live data

Leave the staff code blank for **local-only** mode (data stays in that browser).

## Deployment

### Vercel

1. Push this repo to GitHub and [import it on Vercel](https://vercel.com/new), or run `npx vercel` from the project folder.
2. Vercel will use `vercel.json` — **Build Command:** `npm run build`, **Output:** project root.
3. In Vercel → **Project → Settings → Environment Variables**, add these for **Production** (and Preview if you use preview deploys):

   | Name | Example |
   |------|---------|
   | `FIREBASE_API_KEY` | `AIzaSy...` |
   | `FIREBASE_AUTH_DOMAIN` | `cart-checkout-91a7e.firebaseapp.com` |
   | `FIREBASE_PROJECT_ID` | `cart-checkout-91a7e` |
   | `FIREBASE_STORAGE_BUCKET` | `cart-checkout-91a7e.firebasestorage.app` |
   | `FIREBASE_MESSAGING_SENDER_ID` | `103328290163` |
   | `FIREBASE_APP_ID` | `1:103328290163:web:...` |
   | `FIREBASE_MEASUREMENT_ID` | `G-...` (optional) |

4. **Redeploy** after saving env vars (Deployments → ⋯ → Redeploy).
5. In **Firebase Console → Authentication → Settings → Authorized domains**, add your Vercel URL (e.g. `your-app.vercel.app`) if you use Auth later. Firestore works without this for your current setup.

The build generates `firebase-config.js` from those variables. `.env` is never uploaded to Vercel.

### Any static host

Run `npm run build` locally with `.env` present, then upload the generated files including `firebase-config.js`.

## Usage

| View | Action |
|------|--------|
| **Carts** | Check out cart → monitor list → **Check in** when returned |
| **Parking** | Issue permit → monitor list → **Car departed** when they leave |

Alerts appear when carts exceed **30 minutes** or parking exceeds **15 minutes**.

## Browser support

Modern browsers with ES modules, `localStorage`, and CSS Grid/Flexbox.
