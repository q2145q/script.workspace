import { NextRequest, NextResponse } from "next/server";

const publicPaths = ["/sign-in", "/sign-up", "/api/auth"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Allow API routes
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Check for session cookie (Better Auth uses "better-auth.session_token")
  const sessionToken =
    request.cookies.get("better-auth.session_token")?.value;

  if (!sessionToken && pathname !== "/") {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
