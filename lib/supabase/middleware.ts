import { NextResponse, type NextRequest } from 'next/server';

import { GetAuthUser } from '../auth-utils';

export async function updateSession(request: NextRequest) {
  const isPublicPath =
    request.nextUrl.pathname === '/' || request.nextUrl.pathname.startsWith('/auth');
  const isAdminPath = request.nextUrl.pathname.startsWith('/admin');

  // Only attempt to get user if it's not a public path
  const authUser = !isPublicPath ? await GetAuthUser() : null;

  console.log('authUser', authUser);
  console.log('isPublicPath', isPublicPath);
  console.log('request.nextUrl.pathname', request.nextUrl.pathname);
  if (!authUser && !isPublicPath) {
    console.log('redirecting to login');
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    return NextResponse.redirect(url);
  }

  if (isAdminPath && authUser?.role !== 'admin') {
    console.log('redirecting to protected');
    // user is not an admin, redirect to protected page
    const url = request.nextUrl.clone();
    url.pathname = '/protected';
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
