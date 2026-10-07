# CLAUDE.md: Ground Up

Sports network + explainable athlete-to-opportunity recommender. Read `PRD.md` (what/why) and `ARCHITECTURE.md` (how, Stage 1 free tier and Stage 2 AWS) before big changes. Original scope: `Ground Up_ Sports AI Career Assistant, M2 Report (1).html`.

## Rule: keep this file current
- After **every finished task**, update the **Status** section below (what changed, what's next, open issues). Keep it short; prune old lines.
- When context is compacted (auto or manual), first re-read this file, then bring Status up to date from the summary.
- If a decision changes architecture or scope, update `ARCHITECTURE.md` / `PRD.md` too.

## Layout
```
api/        FastAPI (Python 3.12, uv). app/{main,auth,config,db,models,matching,seed}.py, migrations/, tests/
web/        Next.js 16 App Router + Turbopack + Tailwind v4. app/, components/, lib/{api,use-api}.ts, proxy.ts
render.yaml Render blueprint (api, Docker, free plan)
docker-compose.yml  local Postgres (host :5433) + api (host :8001)
```

## Commands
```bash
docker compose up -d                                   # db + api (migrations run on boot, --reload)
docker compose exec api python -m app.seed 300         # synthetic opportunities (fixed seed)
docker compose run --rm api sh -c "uv sync --frozen -q && python -m pytest -q"   # api tests
docker compose run --rm api alembic revision --autogenerate -m "msg"            # new migration
cd web && npm run dev      # http://localhost:3000 (Turbopack is the default bundler in Next 16)
cd web && npm run build && npm run lint
```
Windows host note: Smart App Control blocks psycopg/sklearn DLLs and venv `.exe` shims. Run Python **inside Docker**, not on the host.

## Conventions
- Next.js 16 differs from older docs: `proxy.ts` (not middleware), `cacheComponents` on. Check `web/node_modules/next/dist/docs/` before using new APIs.
- Design: zinc neutrals + one accent (`--accent` pitch green), Geist, Phosphor icons only, tokens in `web/app/globals.css` (`btn-primary`, `btn-ghost`, `field`, `panel`). Radius: inputs/buttons `rounded-lg`, panels `rounded-2xl`. Light + dark via `prefers-color-scheme`. No em-dashes in UI copy.
- API: sync SQLAlchemy, Pydantic validation at the boundary, UUID keys, tz-aware timestamps, keyset pagination.
- Matcher (`api/app/matching.py`) stays pure (duck-typed inputs). Any change keeps `tests/test_matching.py` green (report example = 93.5).
- Deliberate shortcuts are marked `ponytail:` with their ceiling + upgrade path.
- Never store ID document numbers. Never log tokens.

## Env vars
api: `ENV`, `DATABASE_URL` (Neon pooled, sslmode=require), `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `CORS_ORIGINS`
web: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`

## Status (update every task)
**2026-10-08: Stage 1 scaffold done**
- Done: PRD, ARCHITECTURE, CLAUDE.md. API: auth (Google + dev), profile, verification request, opportunities, recommended (matcher), posts, people suggested, Alembic init migration, seed generator, 3 matcher tests passing. Web: login, verify, profile setup, feed, opportunities with score ring + reasons. Verified end-to-end in headless Chrome (light, dark, 390px mobile); build + lint clean (4 intentional `location.href` warnings).
- Not deployed yet. Needs user: Neon project (pooled URL), Google OAuth client ID, Render + Vercel linked to a GitHub repo.
- Next (report week 1-2): load public athlete dataset, org opportunity posting UI, evaluation module (NDCG@K, baselines, ablation).
- Later (week 3-4): Sentence-BERT goals similarity, human-rated sample, optional RF re-rank, phone OTP, real KYC.
- Login hero image is a picsum placeholder; replace with real athlete photo in `web/public`.
