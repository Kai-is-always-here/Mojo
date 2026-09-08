# BoxOffice Platform — Owner / Admin / Client

Mobile-first starter architecture for a role-separated platform:

- **Owner Frontend** — global monitoring, admin creation, system settings, all-client visibility.
- **Admin Frontend** — assigned-client management, messaging, client status/credit controls.
- **Client Frontend** — login/register, invitation-code onboarding, home, starting/task center, history, profile.
- **Backend** — Express API, JWT authentication, role-based authorization, rate limiting, Helmet, password hashing.
- **15 languages** — English, Chinese, Spanish, French, German, Portuguese, Russian, Japanese, Korean, Arabic, Hindi, **MM** (#12), Thai, Vietnamese, Indonesian.

## Quick start

1. Install Node.js 20+.
2. Open a terminal in `server/`.
3. Run `npm install`.
4. Copy `.env.example` to `.env` and set a strong `JWT_SECRET`, `OWNER_EMAIL`, and `OWNER_PASSWORD`.
5. Run `npm run dev`.
6. Serve the three frontend folders with any static server. Example with VS Code Live Server:
   - `apps/client/login.html`
   - `apps/admin/login.html`
   - `apps/owner/login.html`

The frontends default to the same-origin `/api` endpoint. For a separately hosted API, set `localStorage.bo_api` or the frontend `config.js` value to the deployed API base URL.

## Default owner

The first server start creates `server/data/db.json` using `OWNER_EMAIL` and `OWNER_PASSWORD` from `.env`.

**Change these credentials before production.**

## Role flow

`Owner → creates Admin → Admin receives random 5-digit invitation code → Client registers using that code → Client is linked to that Admin.`

Invitation codes are generated server-side with a five-digit numeric format.

## Important production hardening

This scaffold is intentionally dependency-light and uses JSON persistence for the first build. Before a real deployment, replace the JSON store with PostgreSQL/MySQL, add refresh-token/session rotation, audit logs, CSRF protection where applicable, strict CORS allowlists, secret management, object storage for media, validation with a schema library, automated tests, backups, and HTTPS.

## Suggested deployment split

- `apps/owner` → `owner.your-domain.com`
- `apps/admin` → `admin.your-domain.com`
- `apps/client` → `app.your-domain.com`
- `server` → `api.your-domain.com`

The same visual system is shared conceptually across all three portals, while role-specific pages and controls remain separated.


## v1.1 additions

- Owner can permanently delete an Admin. Deleting an Admin cascades to that Admin's clients and messages in the current local data layer.
- Owner can permanently delete an individual Client.
- Admin and Client now have a private one-to-one message thread.
- Messages support text plus image/PDF/TXT/ZIP attachments up to 8 MB in the current local demo.
- Attachments are served through an authenticated message-file endpoint rather than a public uploads directory.
- Client UI uses neutral service language such as **Service**, **System**, and **Customer Service** instead of exposing Owner/Admin controls. This is UI separation only; backend role authorization remains the security boundary.
- Added `server/sql_schema_preview.sql` for the next Supabase/PostgreSQL migration.

### Production database direction

The recommended production path remains Supabase PostgreSQL + Supabase Storage + Realtime. The current demo intentionally keeps JSON persistence so it can run locally without cloud credentials. Supabase Free currently includes PostgreSQL, 1 GB Storage, and Realtime quotas; free projects may pause after inactivity. Cloudflare's current Workers/Pages free tiers can host the separate frontends/API path within their published limits.


## v1.2 — Shared multilingual UI

- Replaced the shared language catalog with a 15-language ES-module dictionary: EN, ZH, JA, KO, ES, FR, DE, IT, PT, RU, AR, MY, TH, VI, ID.
- Myanmar is language #12 and is displayed as `MY`.
- Added the expanded translation key set for login, registration, client dashboard, tasks, account, customer service, and language UI.
- Added a safe English fallback for missing translation keys.
- Added language metadata and persistent `bo_lang` selection across Owner, Admin, and Client frontends.
- Added placeholder translation support and RTL document direction for Arabic.
- Kept the implementation as plain JavaScript ES modules so the existing static HTML frontends do not require a TypeScript migration.


## v1.3 — 2026 Trending Movies + Deployment Hardening

- Added a 50-title 2026 worldwide movie catalog to the Client frontend and SQL seed.
- The catalog is a dated snapshot based on the current 2026 worldwide ranking published by Box Office Mojo; refresh the data before presenting it as live box-office data.
- Added a dedicated `apps/client/movies.html` catalog page with mobile-first cards, rank, genre and worldwide gross.
- Added static security headers for Client/Admin/Owner deployments.
- Hardened API CORS to an explicit allow-list and enabled proxy awareness.
- Added production environment placeholders for Supabase and allowed origins.
- Added the `movies` table and seed migration for Supabase.

### Free deployment layout

Use one GitHub repository with three static Cloudflare Pages projects, each pointing to a different output directory:

- Client → `apps/client`
- Admin → `apps/admin`
- Owner → `apps/owner`

Deploy the Express API separately on a Node-compatible host and set `ALLOWED_ORIGINS` to the deployed frontend origins. Do not commit `.env` files or Supabase service-role keys.

### Data note

The 50 movie records are not a live API feed. They are a current snapshot captured from Box Office Mojo's 2026 worldwide chart. Live production data should be refreshed by a scheduled backend job or an appropriately licensed data provider.

## v1.4 — Production database foundation

The project now includes `supabase/migrations/20260908_production.sql`, which establishes the production PostgreSQL/RLS foundation for Auth, Owner/Admin/Client roles, five-digit invitation codes, assigned client conversations, messages, private message attachments, notifications, audit logs, and the 2026 movie catalog.

**Important:** v1.4 does not claim the existing local JSON API has been fully replaced. The migration is the next production integration layer. Before a real deployment, connect the application services to Supabase Auth/Postgres/Storage, remove reliance on `server/data/db.json`, and configure the environment variables in `server/.env.example`.

Use only the Supabase publishable/anon key in browser code. Keep the service-role/secret key server-side and out of GitHub.


## v1.5 — Deployment-ready frontend configuration

- Removed the production-breaking hard-coded hard-coded local API URL dependency.
- Added `config.js` to Client/Admin/Owner so the API origin can be configured without editing application logic.
- Default API path is same-origin `/api`, which works cleanly when a reverse proxy maps `/api` to the Node service.
- Added valid Cloudflare Pages security headers including a restrictive CSP.
- Added `render.yaml` for Node API deployment and `DEPLOYMENT.md` with the production checklist.
- Added graceful API shutdown handling for managed hosting.
- Production same-origin mode does not require a CORS allow-list; cross-origin deployments can opt in with `ALLOWED_ORIGINS`.

### Recommended zero-budget deployment architecture

For the smoothest initial deployment, use one Node API service plus three static frontend sites. If the hosting provider supports reverse-proxy routing, map `/api/*` to the API and keep the frontends on their own static origins. Otherwise set each frontend `config.js` `API_BASE` to the deployed API URL and list all three frontend origins in `ALLOWED_ORIGINS`.


## v1.6 Single-Service Deployment

The package can be deployed as one Docker web service: Client at `/`, Admin at `/control/a7c91`, Owner at `/control/f4m28`, API at `/api`. The frontends use same-origin `/api` by default.


## v1.7 — Production persistence and security hardening

- Switched production persistence from ephemeral JSON files to a private Supabase `platform_state` table.
- Switched production message attachments to private Supabase Storage with short-lived signed URLs.
- Added cryptographically secure invitation-code generation and uniqueness checks.
- Added JWT issuer/audience validation.
- Added stricter password, phone, email, invitation-code, status and credit-score validation.
- Added route-specific request-size limits and stricter authentication/write rate limits.
- Fixed same-origin CORS so the single Docker deployment works without an unnecessary CORS allow-list.
- Added safer attachment path handling and cleanup on Owner deletion.
- Production now fails closed if the durable Supabase server credentials are missing.
