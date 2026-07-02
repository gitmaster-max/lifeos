# LifeOS — Precision Performance

A unified life dashboard: health, finance, nutrition, mind, calendar, insurance and legacy planning in one interface. Built for the Indian market first (INR, Indian cities, IST), designed to go global.

## Business model: affiliation

LifeOS makes money through contextual partner suggestions — not ads, not selling data. Each module reads the user's own scenario and suggests a partner service that makes them better, with LifeOS earning a referral fee:

- **Health** → Manipal Hospitals, Superhealth Hospitals (Bangalore), Practo (e.g., "B12 at 42% — book a diagnostic panel")
- **Finance** → Dezerv, INDmoney (e.g., "allocation drifted +3.1% — expert rebalance")
- **Nutrition** → The Whole Truth, Eat Fit, FreshToHome (links to what they offer)
- **Insurance** → Ditto Insurance advisory, plus a manual policy registry with premium-due reminders
- **Mind** → Cult.fit, Amaha

The **Calendar** is purely personal (vacations, dates, dentist visits — no work items). **Nominees** exists because nominees are mandatory in India yet families often never learn what was assigned to them — this is a family account, so assignments are visible to everyone in it.

Partner config lives in `assets/app.js` (`PARTNER_LINKS` + `AFFILIATES`) — one place to add partners, offers and tracking codes when this goes to product.

## What's inside

The frontend is a static site — no build step, no dependencies to install, and it works
fully offline (all data in `localStorage`) with zero backend running.

- `index.html` — landing page (entry point)
- `onboarding-1-city.html` → `onboarding-4-metrics.html` — 4-step onboarding (choices persist)
- `dashboard.html` + 7 module pages (health, finance, nutrition, calendar, mind, insurance, nominees)
- `audit.html` — sample Life Audit report (all gaps in one shareable page)
- `liabilities.html` — loan tracker with amortization schedules and prepayment optimizer
- `vault.html` — family document registry with DigiLocker (Govt. of India) connection
- `plate.html` — Design Your Plate (DAREBEETS formula)
- `serve.py` / `start-lifeos.bat` — one-click localhost server
- `assets/` — shared styles, runtime JS, favicon
- `server/` — optional Node/Express API for real accounts and cross-device family sync
  (see `server/README.md`). The frontend progressively enhances: sign in from the
  "Sign in to sync" control in the sidebar and your data starts following your family
  account instead of staying on one device; skip it and the app behaves exactly as before.

## Features

- Command palette: press **Ctrl/Cmd + K** anywhere (or click any search bar)
- Quick Entry logging (meals, workouts, expenses, notes) with a live Recent Entries feed on the dashboard
- Onboarding profile 