# CarePlus Medical Centre

CarePlus is a hospital management platform built as a monorepo.

## Applications

- `apps/admin` — administration and staff dashboard
- `apps/website` — public hospital website (planned)
- `apps/patient` — patient portal (planned)
- `apps/doctor` — doctor portal (planned)

## Shared packages

- `packages/ui` — shared interface components (planned)
- `packages/database` — shared Supabase/database types and helpers (planned)
- `packages/auth` — shared authentication utilities (planned)

## Backend

The existing CarePlus backend uses Supabase/PostgreSQL and n8n automation. Frontend applications will connect to approved Supabase interfaces and will not contain n8n or Twilio secrets.

## Local development

From the repository root:

```bash
npm install
npm run dev:admin
```

Then open `http://localhost:3000`.
