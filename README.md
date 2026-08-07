# LedgerLens

An AI-assisted analytics dashboard that ingests any spreadsheet (`.xlsx`, `.xls`, `.csv`), statistically
profiles every column, detects correlated patterns, flags anomalies, and — if you provide an Anthropic
API key — writes up a plain-English narrative of what it found.

Built with **Next.js 14 (App Router)** so it deploys natively on **Vercel** with zero configuration.

## How it works

1. **Upload** — a file is dropped or selected in the browser and POSTed as `FormData` to `/api/analyze`.
2. **Parse** — the API route (Node.js runtime) reads the workbook server-side with
   [`xlsx`](https://www.npmjs.com/package/xlsx) (SheetJS). Nothing is written to disk or a database; the
   buffer lives only for the duration of the request.
3. **Profile** — `lib/analysis.js` infers a type for every column (numeric / categorical / date / text),
   then computes:
   - Numeric: mean, median, standard deviation, min/max, quartiles, a 10-bucket histogram
   - Categorical: unique-value count, top categories
   - Cross-column Pearson correlation (numeric columns, `|r| ≥ 0.5`)
4. **Detect anomalies** — two classic, dependency-free statistical methods:
   - **Z-score**: flags values more than 3 standard deviations from the column mean
   - **IQR fencing (Tukey's method)**: flags values outside `Q1 − 1.5×IQR` / `Q3 + 1.5×IQR`
   - Rare one-off categorical values in high-cardinality columns are also surfaced
   - A value caught by both numeric methods is scored `high` severity
5. **AI narrative (optional)** — if `ANTHROPIC_API_KEY` is set, a compact JSON summary of the *statistics*
   (never raw rows) is sent to Claude, which returns a short natural-language summary, notable patterns,
   an anomaly interpretation, and suggested next steps. Without the key, the dashboard still works fully —
   this section is simply omitted.
6. **Dashboard** — `components/Dashboard.jsx` renders overview cards, the AI narrative, a correlation
   table, a per-column chart grid (histograms for numeric, bar charts for categorical), and a scrollable
   anomaly table with severity badges.

## Run locally

```bash
npm install
cp .env.example .env.local   # optional — add ANTHROPIC_API_KEY to enable the AI narrative
npm run dev
```

Visit `http://localhost:3000` and drop in a spreadsheet.

## Deploy to Vercel

**Option A — Vercel dashboard (no CLI needed)**
1. Push this folder to a GitHub repo.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo. Vercel auto-detects Next.js —
   no build settings to change.
3. Under **Settings → Environment Variables**, optionally add `ANTHROPIC_API_KEY`.
4. Click **Deploy**. You'll get a live `*.vercel.app` URL in about a minute.

**Option B — Vercel CLI**
```bash
npm install -g vercel
vercel login
vercel                 # first deploy, follow the prompts
vercel env add ANTHROPIC_API_KEY   # optional
vercel --prod
```

## Project structure

```
app/
  page.js                 → landing page + upload flow (client component)
  layout.js                → fonts, metadata
  globals.css               → Tailwind + design tokens
  api/analyze/route.js      → POST endpoint: parse → analyze → (optional) AI narrative
components/
  UploadZone.jsx            → drag-and-drop upload UI
  Dashboard.jsx              → all result visualizations
lib/
  analysis.js                → type inference, stats, correlation, anomaly detection
  aiInsights.js               → Anthropic API call + prompt
```

## Notes & limits

- Files are capped at 10MB and processed entirely in-memory inside the serverless function — nothing
  persists after the response is sent.
- Anomaly detection is unsupervised and threshold-based (z-score / IQR), so it works on any dataset out
  of the box with no training step, but it's a statistical heuristic, not a guarantee — always sanity-check
  flagged rows against domain knowledge before acting on them.
- For very wide sheets (100+ columns), consider raising `maxDuration` in `app/api/analyze/route.js` on
  paid Vercel plans if you hit the function timeout.
