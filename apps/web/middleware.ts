import { NextRequest, NextResponse } from "next/server";

const publicPaths = ["/sign-in", "/sign-up", "/api/auth", "/privacy", "/terms", "/robots.txt", "/sitemap.xml"];

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return addSecurityHeaders(NextResponse.next());
  }

  // Allow API routes
  if (pathname.startsWith("/api/")) {
    return addSecurityHeaders(NextResponse.next());
  }

  // Check for session cookie (Better Auth uses "__Secure-" prefix on HTTPS)
  const sessionToken =
    request.cookies.get("better-auth.session_token")?.value ||
    request.cookies.get("__Secure-better-auth.session_token")?.value;

  if (!sessionToken && pathname !== "/") {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return addSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|otf|css|js)$).*)"],
};
