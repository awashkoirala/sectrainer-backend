# SecTrainer Backend

Node.js + Express + PostgreSQL API for SecTrainer: user accounts, cross-device
progress sync, a public leaderboard, and a secure proxy for the AI "explain
differently" feature (keeps your Anthropic API key off the client).

## 1. Local setup

```bash
cd backend
npm install
cp .env.example .env
# edit .env: fill in DATABASE_URL, JWT_SECRET, ANTHROPIC_API_KEY
npm run migrate   # creates the tables
npm start         # starts the API on http://localhost:3000
```

Quick health check: `curl http://localhost:3000/api/health`

## 2. Getting a free PostgreSQL database

Any of these give you a free Postgres instance and a ready-to-use
`DATABASE_URL`:
- **Neon** (neon.tech) — generous free tier, serverless Postgres
- **Supabase** (supabase.com) — free Postgres + extras you won't need here
- **Render** (render.com) — free Postgres instance (90-day expiry on free tier)
- **Railway** (railway.app) — usage-based free credits

Copy the connection string they give you into `DATABASE_URL` in `.env`.

## 3. Deploying the API itself

Any Node host works. Easiest options:
- **Render** — "New Web Service" → connect your repo → set the same env vars
  from `.env` in the dashboard → it runs `npm install && npm start` automatically
- **Railway** — similar flow, connect repo, set env vars, deploy
- **Fly.io** — if you want more control over region/scaling

Whichever you pick, set these environment variables in the host's dashboard
(same names as `.env.example`):
`DATABASE_URL`, `JWT_SECRET`, `ANTHROPIC_API_KEY`, `CORS_ORIGIN`, `PORT`.

Set `CORS_ORIGIN` to the exact URL where your frontend is hosted (e.g.
`https://sectrainer.netlify.app`) once you know it — don't leave it as `*`
in production, since that would let any website call your API on a logged-in
user's behalf.

## 4. API reference

| Method | Path                | Auth required | Description |
|--------|---------------------|----------------|--------------|
| POST   | /api/auth/register  | no  | `{ username, email, password }` → `{ token, username }` |
| POST   | /api/auth/login     | no  | `{ email, password }` → `{ token, username }` |
| GET    | /api/progress       | yes | Returns `{ data }` — the student's full progress object |
| PUT    | /api/progress       | yes | `{ data }` → saves/overwrites progress |
| GET    | /api/leaderboard    | no  | Top 50 students by accuracy (min. 10 questions attempted) |
| POST   | /api/ai/explain     | yes | `{ question, officialExplanation, userContext }` → `{ explanation }` |

Auth header for protected routes: `Authorization: Bearer <token>`

## 5. Connecting the frontend

In `cybersec-mcq-trainer.html`, set:
```js
const API_BASE_URL = "https://your-deployed-backend.com/api";
```
Everything else (login modal, progress sync, leaderboard view, AI explain)
is already wired to use that base URL once it's set. If a student isn't
logged in, the app falls back to localStorage automatically — nothing
breaks for guests.

## 6. Security notes
- Passwords are hashed with bcrypt, never stored or logged in plain text.
- The Anthropic API key only ever lives on the server — it's never sent to
  the browser.
- The AI explain route is rate-limited per user (30 requests/hour) to avoid
  runaway API costs.
- JWTs expire after 30 days; users will need to log in again after that.
