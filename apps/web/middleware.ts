import { NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

const publicPaths = [
  "/sign-in",
  "/sign-up",
  "/verify-email",
  "/verify-telegram",
  "/forgot-password",
  "/reset-password",
  "/privacy",
  "/terms",
  "/tutorial",
  "/docs",
];

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  return response;
}

/** Strip locale prefix to get the "logical" pathname */
function stripLocale(pathname: string): string {
  for (const locale of routing.locales) {
    if (pathname === `/${locale}`) return "/";
    if (pathname.startsWith(`/${locale}/`))
      return pathname.slice(`/${locale}`.length);
  }
  return pathname;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API routes — no locale handling needed
  if (pathname.startsWith("/api/")) {
    return addSecurityHeaders(NextResponse.next());
  }

  // Run next-intl middleware first (handles locale detection, redirect, rewrite)
  const response = intlMiddleware(request);

  // Add security headers
  addSecurityHeaders(response);

  // Get logical pathname (without locale prefix)
  const logicalPath = stripLocale(pathname);

  // Landing page is always public
  if (logicalPath === "/") {
    return response;
  }

  // Allow public paths
  if (publicPaths.some((path) => logicalPath.startsWith(path))) {
    return response;
  }

  // Check for session cookie (Better Auth uses "__Secure-" prefix on HTTPS)
  const sessionToken =
    request.cookies.get("better-auth.session_token")?.value ||
    request.cookies.get("__Secure-better-auth.session_token")?.value;

  if (!sessionToken) {
    const signInUrl = new URL("/sign-in", request.url);
    return NextResponse.redirect(signInUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|otf|css|js)$).*)",
  ],
};
