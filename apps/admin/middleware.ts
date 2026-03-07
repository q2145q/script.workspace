import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow login page and auth API
  if (pathname === "/login" || pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Check admin session cookie
  const session = request.cookies.get("admin_session")?.value;
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // CSRF protection for mutating admin API requests
  // Cross-origin forms can't set custom headers, so requiring x-csrf-check
  // blocks CSRF attacks without needing token management.
  const method = request.method;
  if (
    pathname.startsWith("/api/admin/") &&
    (method === "POST" || method === "PUT" || method === "DELETE" || method === "PATCH")
  ) {
    if (request.headers.get("x-csrf-check") !== "1") {
      return NextResponse.json({ error: "CSRF check failed" }, { status: 403 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|otf|css|js)$).*)",
  ],
};
