import { NextResponse, type NextRequest } from 'next/server';

import { GetAuthUser } from '../auth-utils';

export async function updateSession(request: NextRequest) {
  // Define public paths that do not require authentication
  const publicPaths = ['/', '/auth'];

  const isPublicPath = publicPaths.some(
    (path) => path === '/' || request.nextUrl.pathname.startsWith(path),
  );

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // Only attempt to get user if it's not a public path
  const authUser = !isPublicPath ? await GetAuthUser() : null;

  if (!authUser && !isPublicPath) {
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    return NextResponse.redirect(url);
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return NextResponse.next({
    request,
  });
}
