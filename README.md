![MIT License](https://img.shields.io/github/license/a-barzanti/SupabaseAuthKit)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)
![Built with pnpm](https://img.shields.io/badge/built%20with-pnpm-blueviolet)

# SupabaseAuthKit

Next.js + Supabase + TypeScript starter with built-in authentication, RBAC, protected routes, admin panel. API-first and SSR-ready.

## 🚀 Features

- 📚 Next.js 15 (App Router)
- 💻 TypeScript-first
- 🔐 Supabase Auth (email/password login, OAuth ready)
- ⚙️ Role-based access control (via RLS)
- 🎨 TailwindCSS + shadcn/ui
- 🚀 Fully SSR-compatible (via @supabase/ssr)
- 🛠 Protected routes & middleware
- 🧑‍💼 Admin panel (assign user roles)
- 🔒 JWT-based API access

## 📦 Quick Start

```bash
npx create-next-app --example with-supabase supabase-auth-kit
cd supabase-auth-kit
pnpm install
cp .env.local.example .env.local
pnpm run dev
```
