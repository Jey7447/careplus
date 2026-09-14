# CarePlus Admin

The CarePlus administration dashboard uses Next.js and Supabase Auth with cookie-based SSR sessions.

## Environment variables

Create `apps/admin/.env.local` locally with:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

Do not commit `.env.local`, passwords, service-role keys, or other secrets.

## Authentication

- `/login` is the public sign-in page.
- Other application routes require an authenticated Supabase session.
- The middleware verifies the session with Supabase Auth before allowing access.
- The dashboard reads the verified authentication claims server-side.

## Run locally

From the repository root:

```bash
npm install
npm run dev:admin
```

Then open `http://localhost:3000`.
