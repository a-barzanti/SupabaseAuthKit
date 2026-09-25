# Next.js App Router integration

Supported integration: Supabase Auth + App Router + TypeScript. The reference baseline uses Next.js 15, React 19, `@supabase/ssr` 0.6.1 and `@supabase/supabase-js` 2.50.4. Inspect the target lockfile and current official docs before adapting APIs. Do not overwrite an existing auth flow. Next.js 16 uses a different middleware/proxy convention and has not been validated by this kit.

## Clients and email/password authentication

Use separate cookie-aware browser and server clients. `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` contain only the project URL and public key. Never put a service key in a `NEXT_PUBLIC_` variable. Add `@supabase/ssr` and `@supabase/supabase-js` to the target if missing.

Browser client (`lib/supabase/client.ts`):

```ts
import { createBrowserClient } from '@supabase/ssr';
export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}
```

Server client (`lib/supabase/server.ts`):

```ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
export async function createClient() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(values) {
        try { values.forEach(({name, value, options}) => store.set(name, value, options)); }
        catch { /* Server Components cannot write cookies; middleware must refresh them. */ }
      },
    },
  });
}
```

For a fresh application, add forms calling `auth.signUp`, `auth.signInWithPassword`, `auth.resetPasswordForEmail`, `auth.updateUser({password})` and `auth.signOut`. Validate password confirmation, show errors, and redirect successful login to the workspace. Never send `intended_role` or other authorization metadata. Configure the Auth site URL/allowed redirects for the application's origin. For email confirmation use an `/auth/confirm` route that takes `token_hash` and a validated `EmailOtpType`, calls `verifyOtp`, and redirects only to an internal allowlisted path. Configure the email template link accordingly. Keep email confirmation enabled in production according to the application's requirements; the local test stack disables confirmation only for development. Auth callbacks/recovery routes must remain public.

Middleware must create a request-specific SSR client, propagate new cookies onto both the request and response, and call `auth.getUser()` before trusting identity. Preserve those cookies when returning redirects. Do not call a server-component client from middleware. Example for Next.js 15:

```ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({request});
  const client = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values) {
        values.forEach(({name, value}) => request.cookies.set(name, value));
        response = NextResponse.next({request});
        values.forEach(({name, value, options}) => response.cookies.set(name, value, options));
      },
    },
  });
  const {data: {user}} = await client.auth.getUser();
  if (!user && request.nextUrl.pathname.startsWith('/protected')) {
    const target = new URL('/auth/login', request.url);
    const redirect = NextResponse.redirect(target);
    response.cookies.getAll().forEach(cookie => redirect.cookies.set(cookie));
    return redirect;
  }
  return response;
}
export const config = { matcher: ['/protected/:path*', '/auth/:path*'] };
```

Adapt the matcher to every auth-dependent page. Public pages displaying a session also need refresh handling. Middleware is navigation support; pages/actions and database RLS still enforce their own authorization. No token hook or platform tables are required on a fresh install.

## Workspace wiring

Copy `assets/ui/organization-workspace.tsx` into the target. It imports only React, Next.js and Supabase types. It uses Tailwind classes; adapt styles if absent. Wrap it in a client component that creates the browser client with `useState(createClient)` and passes it as `client`; do not pass a Supabase client from a Server Component across the serialization boundary.

In the protected server page:

1. Create the request's server client and verify `auth.getUser()`; redirect unauthenticated users to login.
2. Query `organizations.select('id, name').order('created_at')`. RLS returns current memberships only.
3. Read the requested `organization` URL parameter. Choose it only if present in those results; otherwise choose the first visible organization or null. A removed/forged selection never enables access.
4. For a selected organization, fetch `organization_memberships.select('user_id, role')` and `organization_projects.select('id, name')`, each with `.eq('organization_id', active)`. Handle database errors rather than rendering a false empty success state.
5. Render the wrapper with `userId`, `organizations`, `active`, `members` and `projects`. Refetch after mutations/navigation. No global authorization cache, cookie trust, or service client.

The component supports creation, switching, add-by-UUID, role changes, leaving/removal, transfer, and project CRUD. The parent/child tasks example is available through the API and tests; a task editor is optional. Preserve readable errors, disabled pending forms, empty states and accessible labels. UI visibility follows the matrix but never substitutes for RPC checks/RLS.

## Official sources

- [Supabase SSR setup](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs)
- [Supabase password authentication](https://supabase.com/docs/guides/auth/passwords)
- [Next.js authentication guide](https://nextjs.org/docs/app/guides/authentication)
- [Next.js security advisory motivating the reference dependency update](https://nextjs.org/blog/CVE-2025-66478)
