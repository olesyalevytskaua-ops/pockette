# Pockette

A mobile-first, offline wallet for loyalty cards and promo codes. Everything stays in the browser: no account, server, analytics or sync.

## Run

Node.js 20.19+ or 22.12+.

```sh
npm ci
npm run dev       # http://localhost:5173
npm run build     # production build with offline service worker, in dist/
npm run preview   # http://localhost:4173
```

## Test

```sh
npx playwright install chromium
npm test
```

The suite covers card CRUD, search, stack-card hit areas, Code 128 / QR / EAN-13 rendering and validation, offline reload, duplicate-safe backup import, photo and camera scanning, and coupon and theme persistence.

## Features

- **Cards:** stack view (180px cards, 60px of each showing, full number on the front card) or tile view, switched from the header and remembered. Search, Reorder with Move up / Move down.
- **Codes:** drawn locally for Code 128, EAN-13, EAN-8, UPC-A, Code 39 and QR, black on white with a quiet zone. EAN and UPC check digits are validated; leading zeros are kept.
- **Scanning:** camera or photo, decoded on the device. Manual entry is always available.
- **Coupons:** save, copy, edit and remove promo codes with optional offer and expiry; codes expiring within a week are flagged.
- **Settings:** Appearance (System / Light / Dark), default card layout, JSON backup and import (merges without duplicates, up to 1,000 items / 1 MB).
- **Languages:** English and Ukrainian, chosen in Settings (defaults to the browser language). Strings live in `src/i18n.ts`.
- **Splash:** shown once per launch, about 2.4s, skipped by any tap or key; light and dark (`src/Splash.tsx`).
- **PWA:** installable; the app shell, fonts and code renderer are precached after the first visit.

## Design system

Design System v2: Maison layout with Cellar Noir cards.

- `src/style.css`: light and dark tokens, then the components (CardStrip, CardTile, AddCardTile, LayoutSwitch, PrimaryButton, SearchField, chips, TabBar, sheets, toast).
- `src/tone.ts`: the six card presets (Bordeaux, Navy, Teal, Gold, Espresso, Purple) and the gradient derived for any other card colour, with text chosen for ≥ 4.5:1 contrast.
- Type: Cormorant Garamond (display) and Inter (UI), self-hosted through `@fontsource`.

## Project files

- `src/main.tsx`: app shell, cards, editor, settings, storage and validation.
- `src/promos.tsx`: coupon form and coupon row.
- `src/CodeScanner.tsx`: camera and photo scanner.
- `src/code-formats.ts`: supported symbologies and their validation.
- `public/`: app icons. `tests/`: Playwright suite.

## Data and limits

Clearing browser data removes your cards, so export a backup first. Backup files hold card numbers and codes in plain text, and browser storage is not encrypted. Some stores use formats this app does not support (PDF417, Aztec, proprietary codes). Real checkout scanners still need testing.
