import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookies) {
          cookies.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const isPublic = path === '/' || path === '/auth' || path.startsWith('/auth/');
  let destination: string | undefined;
  if (!user && !isPublic) destination = '/auth/login';
  if (user && (path === '/admin' || path.startsWith('/admin/'))) {
    const { data: role } = await supabase.rpc('current_platform_role');
    if (role !== 'admin') destination = '/protected';
  }
  if (destination) {
    const url = request.nextUrl.clone();
    url.pathname = destination;
    url.search = '';
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }
  return response;
}
