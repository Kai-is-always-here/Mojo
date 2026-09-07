# BoxOffice Platform — Production Deployment

This release is packaged as **one Docker web service**. Client, Admin, Owner and API share one HTTPS origin, so there is no frontend build pipeline to coordinate.

## Runtime layout

- `/` → Client
- `/login` → Client login
- `/register` → Client registration
- `/movies` → 2026 movie catalog
- `/support` → Customer Service
- `/control/a7c91` → Admin workspace
- `/control/f4m28` → Owner workspace
- `/api/*` → backend API

The Admin/Owner paths are not linked from the Client UI. This is only an additional discovery barrier; role authorization is enforced by the backend.

## Production hardening included

- Node.js 20 Docker runtime
- Helmet security middleware
- `x-powered-by` disabled
- Same-origin deployment by default; CORS is enabled only when an explicit allow-list is supplied
- General API rate limiting plus stricter authentication/write limits
- Request-body limits by route; attachment requests remain capped at 8 MB
- Password hashing with bcrypt
- JWT issuer/audience validation and 8-hour expiry
- Cryptographically secure unique 5-digit Admin and Client invitation codes
- Client-to-client referral hierarchy preserves the original Admin assignment
- Completed orders credit a single 0.7% commission ledger entry per order
- Strict role checks for Owner/Admin/Client operations
- Authenticated attachment access with 5-minute Supabase signed URLs
- Supabase Storage for production attachments
- Supabase `platform_state` for durable server state
- Local JSON/filesystem fallback only for development
- Graceful shutdown for managed hosting
- Atomic local writes for development data

## Required deployment secrets

The included `render.yaml` generates `JWT_SECRET`. You must provide:

- `OWNER_EMAIL`
- `OWNER_PASSWORD`
- `SUPABASE_SERVICE_ROLE_KEY`

The Supabase URL is already set to the project used by this package. The service-role key is **server-only** and must never be placed in browser JavaScript, `config.js`, GitHub, or public environment variables.

## Supabase initialization

Run the included migration:

`supabase/migrations/20260908_production.sql`

It creates the application tables, RLS foundation, private attachment bucket, Realtime configuration, movie catalog foundation, and the server-side `platform_state` table used for durable persistence.

After the migration exists, the Docker service can initialize its durable state automatically on first start.

## Important data model note

The included API keeps a compact server-side state model for compatibility with the current HTML frontends, while Supabase provides the durable store and Storage layer. This is safer than ephemeral host disk, but a future high-volume financial deployment should move high-write domains (messages, audit logs, transactions, movie updates) from the state bridge into their dedicated PostgreSQL tables and transactions.
