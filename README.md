# Planner

A semester planner: a spreadsheet-style grid of dates × classes, plus Today/Week views,
task checkboxes with a confetti celebration, a completed-tasks section, color-coded classes,
and syllabus upload (drop in a PDF/Word syllabus and it scans for dated readings/assignments/
exams for you to review and add).

## Structure

- `server/` — Express API. Talks to a SQLite-compatible database via `@libsql/client`:
  a local file in dev, or a hosted [Turso](https://turso.tech) database in production.
  Also serves the built client in production, so the whole app is one deployable service.
- `client/` — Vite + React + TypeScript + Tailwind.

## Local development

```bash
npm run install:all
npm run dev
```

Opens the API on http://localhost:3001 and the app on http://localhost:5173 (Vite proxies
`/api` to the server). No accounts or API keys needed for local dev — data is stored in
`server/data/planner.db`.

## Deploying as a real website

This turns the local app into an always-on site with its own URL, reachable from any device.
Two free accounts are required (both free, no credit card needed as of writing):

### 1. Create a database — [Turso](https://turso.tech)

1. Sign up at turso.tech.
2. Create a database (any name, e.g. `planner`).
3. From its dashboard, copy the **Database URL** (`libsql://...`) and create/copy an
   **Auth Token**. You'll paste these into your host's environment variables in step 3 —
   keep them private, don't share them in chat or commit them to git.

### 2. Push this code to GitHub

1. Create a new empty repo on [github.com](https://github.com/new).
2. From this folder:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

### 3. Deploy — [Render](https://render.com)

1. Sign up at render.com and connect your GitHub account.
2. New → Web Service → select this repo.
   - **Build Command:** `npm run build`
   - **Start Command:** `npm start`
3. Add environment variables:
   - `TURSO_DATABASE_URL` — from step 1
   - `TURSO_AUTH_TOKEN` — from step 1
4. Deploy. Render gives you a public URL like `https://planner-xxxx.onrender.com` — that's
   your website, reachable from any device.

(A `render.yaml` blueprint is included in the repo root if you'd rather use Render's
"New Blueprint Instance" flow instead of the manual steps above.)

Free-tier note: Render's free web services spin down after periods of inactivity and take
~30-60 seconds to wake back up on the next visit. Your data is safe either way since it
lives in Turso, not on Render's disk.

## Note on syllabus upload accuracy

The syllabus parser is rule-based (regex date matching), not AI — it looks for lines like
"Jan. 21 ..." or "1/21 ..." and groups nearby text as the task. It works well on syllabi with
clear per-line dates, but can miss items or misparse unusual formatting. Always review the
extracted list (editable, with checkboxes) before adding it to your planner.
