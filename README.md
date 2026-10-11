# HerGuide

AI-powered platform that helps women navigate support resources, career pathways, opportunities and entrepreneurship resources in one place. Built around **SDG 5: Gender Equality** (supporting SDG 4, 8, 10). India-first, with the data model ready for other regions.

**Stack:** React + Vite + TypeScript + Tailwind · Express + TypeScript · MongoDB/Mongoose · JWT auth · LLM via the backend only.

> **Status: written but not yet executed.** This code was produced in an environment with no network, Node packages or MongoDB, so it has been syntax-checked and its matching/crisis logic was run in isolation, but it has **not** been installed, type-checked against real library typings, or run end to end. Expect a few small compile or runtime fixes on first run. See "First-run checklist" below.

## Quick start

Requires Node 20+ and MongoDB (`docker compose up -d` starts one locally).

```bash
cp .env.example .env
# generate two secrets and paste them into JWT_ACCESS_SECRET / JWT_REFRESH_SECRET:
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
# add AI_API_KEY (Anthropic) for the AI features

npm run install:all
npm run typecheck          # fix anything it reports before continuing
npm run seed               # starter data (+ admin if ADMIN_EMAIL/ADMIN_PASSWORD set in .env)
npm run dev:server         # http://localhost:5000
npm run dev:client         # http://localhost:5173  (Vite proxies /api to the server)
npm test                   # matching + crisis-detection unit tests
```

Without `AI_API_KEY` everything works except AI features, which return a clear "not configured" message.

## Architecture

```text
React (Vite/TS) --Axios--> Express API (TS) --> MongoDB
                                |-- aiService  (only place that calls the LLM; key never reaches the browser)
                                |-- matchingService (deterministic, explainable scoring; no LLM)
                                |-- documentService (in-memory parse of PDF/DOCX/TXT)
                                |-- crisis (keyword screen -> emergency messaging)
```

Key decisions
- **Auth:** 15-min access token held in memory; refresh token in an httpOnly cookie, rotated on every use (reuse of an old token revokes all sessions). Passwords: bcrypt (cost 12). Reset tokens: random, stored hashed, single-use, 30 min. Rate limits on auth, reset and AI routes.
- **Matching:** six weighted factors (goal, education, skills, experience, location, interests). Factors with missing data are "unknown", excluded from the average, and the score is scaled by sqrt(data coverage), so sparse profiles can't get high-looking scores. The UI shows matches, mismatches, and what couldn't be checked, with "potentially relevant" wording.
- **AI safety:** the LLM writes explanations only. Helplines, organisations, schemes, URLs and deadlines come exclusively from DB records; prompts forbid inventing them. AI JSON is validated with zod (retry once). User/document text is wrapped as data to resist prompt injection. Support requests are screened for danger language and show emergency guidance (112 / 181 / Tele-MANAS 14416) even if the AI call fails.
- **Career readiness %** is computed server-side from skill lists, and `existingSkills` is filtered to skills the user actually listed.
- **Documents:** validated by extension + magic bytes, 5 MB limit, parsed in memory, **file and raw text are never stored**. Only the structured analysis is saved (deletable). Missing information is filled with "Not specified in the provided document." server-side.
- **Authorization:** every query is scoped by `userId`; admin routes require the `admin` role; admins see only name/email/role/joined date for users.

## Spec deviations (deliberate)
- `SupportResource.categories` is an array (one resource serves several situations) instead of a single `category`.
- The spec's `CareerProfile` analysis storage is the `CareerPlan` collection (skill-gap, return-to-work and business plans).
- Admin "manage categories" is read-only: categories are enums in code because they drive matching and AI prompts.
- Assistant chats are not stored (privacy); the client sends recent turns for context.

## Data you must verify before launch
`npm run seed` loads a small set of well-known official programmes and helplines, **all marked `verified: false`** with a `sourceUrl`, and **no deadlines** (left empty rather than guessed). Phone numbers, eligibility and programme details change. Open each source, confirm, edit in **Admin**, then mark verified. The UI shows a "Verify details" badge on unverified records. Add real internships/jobs/returnships via Admin: the seed intentionally doesn't invent any.
The Privacy/Terms pages are **drafts**; have them reviewed. Set `VITE_CONTACT_EMAIL` for the Contact page.

## First-run checklist (the demo flow)
1. Register, complete onboarding -> dashboard personalises.
2. Support: describe a workplace problem -> guidance + resources. Try "he is going to kill me" -> emergency banner appears first.
3. Explore: matches with explanations; Save; Add to tracker.
4. HerWork: skill-gap + roadmap (tick weeks off; progress persists); Return-to-work + gap explanation.
5. Documents: upload a PDF/DOCX/TXT notice -> eligibility/dates/steps.
6. Dashboard: saved items, tracker chart, readiness, activity.
7. Admin (after seeding an admin): add/edit/delete an opportunity and a resource.

## Known limitations / not implemented
- Password-reset email: dev logs the link to the server console; production throws until you wire a provider in `services/mailService.ts`.
- Scanned (image-only) PDFs are unsupported (no OCR).
- Only the Anthropic provider is implemented in `aiService.ts` (swap point is isolated). Model name is set via `AI_MODEL`; confirm it's valid for your account.
- Admin role is read from the JWT (up to 15 min stale after a role change).
- No automated UI/e2e tests; unit tests cover matching and crisis detection only.
- Sentry/analytics/email notifications are out of scope.

## Deployment
- **Database:** MongoDB Atlas; set `MONGODB_URI`.
- **API (Render/Railway/Fly):** build `npm --prefix server run build`, start `npm --prefix server start`. Set all server env vars, `NODE_ENV=production`, `CLIENT_URL` to the exact client origin.
- **Client (Vercel/Netlify):** root `client`, build `npm run build`, output `dist`, set `VITE_API_URL` to the API origin (SPA rewrite included in `client/vercel.json`).
- **Cookies across sites:** if client and API are on different registrable domains, the refresh cookie uses `SameSite=None; Secure` in production (HTTPS required). Same parent domain (e.g. `app.x.com` + `api.x.com`) is more robust, since some browsers block third-party cookies.
- Run `npm run seed` once against production, then verify records in Admin.
