# LifeOS API

Small Node/Express backend that gives the static LifeOS frontend real accounts and
cross-device family sync. Everything the frontend does still works with zero backend
running — this is additive, not a requirement.

## What it does

- **Accounts** — email + password signup/login, JWT sessions (30 days).
- **Family groups** — signing up creates a family with an invite code; anyone with the
  code joins the same family on signup and shares its data.
- **Data sync** — `GET/PUT /api/data` stores the same key/value pairs the frontend used
  to keep only in `localStorage` (`logs`, `profile`, module state, etc.), scoped per family.

Storage is a single JSON file (`data/db.json`) — no database server to install. This is
intentionally minimal for now; swap `data/store.js` for Postgres/SQLite later without
touching any route.

## Run locally

```
cd server
npm install
cp .env.example .env    # then edit JWT_SECRET
npm start
```

Server listens on `http://localhost:4000` by default. Health check: `GET /api/health`.

## API

| Method | Path                | Auth | Body                                    |
|--------|---------------------|------|------------------------------------------|
| POST   | /api/auth/signup    | no   | `{ email, password, name?, inviteCode? }` |
| POST   | /api/auth/login     | no   | `{ email, password }`                     |
| GET    | /api/family/me      | yes  | —                                          |
| GET    | /api/data           | yes  | —                                          |
| PUT    | /api/data/:key      | yes  | `{ value }`                                |
| POST   | /api/data/bulk      | yes  | `{ entries: { key: value, ... } }`         |

Auth = `Authorization: Bearer <token>` header, returned from signup/login.

## Deploying

GitHub Pages (hosting the frontend) only serves static files, so this needs separate
hosting — Render, Railway, or Fly.io all have a free tier that runs a Node app directly
from this folder. Point `CORS_ORIGIN` in `.env` at your Pages URL, then set
`window.LIFEOS_API_URL` in the frontend (see `assets/auth.js`) to the deployed API URL.
