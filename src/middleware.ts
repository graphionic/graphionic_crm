import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge-safe route guard.
 *
 * We only check that a session cookie EXISTS here (cheap, no DB call at the
 * edge). The cookie's JWT signature is verified inside every page/action via
 * requireUser()/requireActiveUser(), which run in the Node runtime.
 *
 * Webhook routes are excluded — Meta and your mail provider must be able to
 * reach them without a session.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic =
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/webhooks") ||
    pathname.startsWith("/api/live") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/privacy") ||
    pathname.startsWith("/terms") ||
    pathname.startsWith("/live") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt";

  if (isPublic) return NextResponse.next();

  const hasSession = Boolean(req.cookies.get("cf_session")?.value);
  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const res = NextResponse.next();
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
