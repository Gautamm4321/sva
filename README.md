# svā labs — coming soon

Immersive coming-soon + waitlist site for **svā labs** (“return to self”).
Next.js 16 (App Router) · TypeScript · React Three Fiber / Three.js · Supabase (waitlist storage).
Creative brief: [`DESIGN.md`](./DESIGN.md).

## What's here

Three sections: **hero** (painted dawn landscape with drifting cloud and mist, and a 3D canopy of hanging botanicals you can sweep through), **svā means self** (brand story in the deck's words), **waitlist** (form + small footer).

```
app/
  page.tsx                  hero → about → waitlist
  privacy/page.tsx          privacy policy (review with counsel before launch)
  api/waitlist/route.ts     POST endpoint (Node runtime)
  globals.css               all styles + self-hosted @font-face
components/
  Hero, Philosophy (about), Waitlist(+Form), SiteHeader, SoundToggle, Reveal
  WorldLayer.tsx            WebGL detection, lazy-load, pointer/scroll → scene, CSS fallback
  world/
    World.tsx               <Canvas>, device tiering, pause when off-screen
    Scene.tsx               landscape + mist passes, strands, camera
    shaders.ts              landscape, mist and botanical sprite shaders
    strands.ts              verlet strand physics (CPU)
    botanicals.ts           canvas-drawn lavender, chamomile, leaves, vetiver, beads
    audio.ts                synthesized ambience + chimes (Web Audio, no files)
lib/
  waitlist/validate.ts      shared client/server validation
  waitlist/store.ts         Supabase REST insert (server only)
  waitlist/protect.ts       rate limit, Turnstile, origin check, IP hashing
supabase/migrations/        waitlist table + RLS
scripts/                    tests + asset generation (not deployed)
preview/                    static preview bundle entry (demo-mode form; not deployed)
public/fonts/               Cormorant Garamond, Inter Tight, DM Mono (OFL — licences included)
```

No product renders, 3D model files, photos or stock assets: the landscape, botanicals and sound are generated in code.

## Local development

Requires Node ≥ 20.9.

```bash
npm install
cp .env.example .env.local   # fill in Supabase values (below)
npm run dev                  # http://localhost:3000
```

Without Supabase values the site runs fully; the form answers “The waitlist isn’t open just yet” (HTTP 503) instead of saving.

Checks: `npm run typecheck`, `npm run lint`, `npm run build`.
Add `?nowebgl` to the URL to preview the no-WebGL fallback.

## Waitlist storage — Supabase setup (≈5 min)

1. Create a project at supabase.com (choose a region near your audience, e.g. Mumbai `ap-south-1`).
2. **SQL Editor → New query →** paste `supabase/migrations/20261027000000_waitlist.sql` → **Run**.
   This creates `public.waitlist` with:
   `id, name, email (unique, lower-case), marketing_consent, consent_timestamp, consent_version, source, created_at`,
   turns on Row Level Security with **no** policies, and revokes table access from `anon` / `authenticated`.
   Public visitors can neither read nor write it; only the server (service role) can insert.
3. **Project Settings → API**: copy the **Project URL** and the **service_role** secret (or a new-style `sb_secret_…` key).
4. Put them in `.env.local` (local) and in your host’s environment variables (production):
   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
5. Submit the form once and check **Table Editor → waitlist**.

Exporting for email marketing: Table Editor → waitlist → Export CSV, or connect your email tool to the table.
Only rows with `marketing_consent = true` should be emailed (the API never stores rows without consent).

### How a signup flows
Form → client validation → `POST /api/waitlist` →
origin check · content-type + 4 KB body cap · honeypot · minimum fill time · rate limit (5 / 10 min / IP hash) ·
server validation + sanitising · optional Turnstile → `INSERT … ON CONFLICT (email) DO NOTHING` via Supabase REST.
New email → `201 joined`; existing email → `200 already` (shown as “Welcome back”); failures → generic message, details only in server logs (email domain only, never the address).

## Environment variables

| Name | Required | Where | Notes |
|---|---|---|---|
| `SUPABASE_URL` | yes | server | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | server | **Secret.** Never prefix with `NEXT_PUBLIC_`. |
| `NEXT_PUBLIC_SITE_URL` | recommended | both | e.g. `https://svalabs.in` — canonical + social tags |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` | optional | both / server | Cloudflare Turnstile bot check; set both or neither |
| `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | optional | server | Durable rate limiting across serverless instances. Without them a per-instance in-memory limiter is used (best-effort). |
| `RATE_LIMIT_SALT` | optional | server | Random string for hashing IPs |

## Deploy — Vercel (recommended)

1. Push this folder to a GitHub repo.
2. vercel.com → **Add New → Project** → import the repo (framework auto-detects Next.js; no build settings to change).
3. **Settings → Environment Variables**: add the variables above for Production (and Preview if wanted).
4. Deploy. Then **Settings → Domains** → add `svalabs.in`.
5. After the domain is live, set `NEXT_PUBLIC_SITE_URL=https://svalabs.in` and redeploy.

## Deploy — Netlify (alternative)

`netlify.toml` is included (Next.js runtime is installed automatically).
Netlify → **Add new site → Import from Git** → pick the repo → add the same environment variables → Deploy.

## Tests in `scripts/` (not part of the deployed app)

| Script | What it checks |
|---|---|
| `supabase-roles.sql` + `db-test.sql` | Migration on a throwaway Postgres: dedupe, lower-case check, consent check, anon/authenticated denied, RLS on |
| `postgrest-shim.mjs` + `api-test.mjs` | 18 end-to-end API cases against real Postgres through a minimal stand-in for Supabase's REST endpoint |
| `form-test.py` | Form in a real browser: inline errors, focus, success, duplicate |
| `shoot.py` | Screenshots per section at several viewports, console errors, horizontal overflow, fallback, reduced motion |
| `make-assets.py` | Regenerates `app/icon.png`, `app/apple-icon.png`, `public/og.jpg` |

## Before launch
- Connect Supabase (above) and make one real signup.
- Have the privacy policy reviewed for your jurisdiction (India DPDP Act; GDPR if you market to the EU).
- Send the welcome/newsletter from an email platform that handles unsubscribes.
- Optional: enable Turnstile + Upstash for stronger abuse protection.
