![MIT License](https://img.shields.io/github/license/a-barzanti/SupabaseAuthKit)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)
![Built with pnpm](https://img.shields.io/badge/built%20with-pnpm-blueviolet)

# SupabaseAuthKit

Next.js + Supabase + TypeScript starter with built-in authentication, RBAC, protected routes, admin panel.

## 🚀 Features

- Next.js 15 (App Router)
- TypeScript-first
- Supabase Auth (email/password login, OAuth ready)
- Role-based access control (via [RLS](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac))
- Styling with [Tailwind CSS](https://tailwindcss.com)
- Components with [shadcn/ui](https://ui.shadcn.com/). This template comes with the default shadcn/ui style initialized. If you instead want other ui.shadcn styles, delete `components.json` and [re-install shadcn/ui](https://ui.shadcn.com/docs/installation/next)
- SSR-compatible (via @supabase/ssr)
- Password-based authentication block installed via the [Supabase UI Library](https://supabase.com/ui/docs/nextjs/password-based-auth)
- Protected routes & middleware
- Admin panel (assign user roles)
- JWT-based API access

## 📦 Quick Start

1. Rename `.env.example` to `.env.local` and update the following:

   ```
   NEXT_PUBLIC_SUPABASE_URL=[INSERT SUPABASE PROJECT URL]
   NEXT_PUBLIC_SUPABASE_ANON_KEY=[INSERT SUPABASE PROJECT API ANON KEY]
   ```

   Both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` can be found in [your Supabase project's API settings](https://supabase.com/dashboard/project/_?showConnect=true)

2. You can now run the Next.js local development server:

   ```bash
   npm run dev
   ```

   The template app should now be running on [localhost:3000](http://localhost:3000/).

## Enable Auth hook

In the dashboard, navigate to `Authentication > Hooks` and select the appropriate function type (SQL or HTTP) from the dropdown menu.

## 🔐 Security Considerations

For improved security and to ensure timely invalidation of user sessions upon role changes (demotion or promotion), it is recommended to set the JWT expiration time to 10-15 minutes. This can be configured in your Supabase project settings.
