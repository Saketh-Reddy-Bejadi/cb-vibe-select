import { auth } from "@/auth";
import { NextResponse } from "next/server";

// Auth gate: "/" needs any signed-in user; "/admin" needs OWNER/ADMIN (owner is superuser).
// Unauthenticated (or under-privileged) users are sent to /login.
// ponytail: role UI is Phase 4; until then OWNER (from OWNER_EMAIL) is the only admin.
export default auth((req) => {
  const { pathname, origin } = req.nextUrl;
  const role = req.auth?.user?.role;
  const signedIn = !!req.auth?.user;

  if (pathname.startsWith("/admin")) {
    if (role !== "OWNER" && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/login", origin));
    }
  } else if (!signedIn) {
    return NextResponse.redirect(new URL("/login", origin));
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/", "/admin/:path*"],
};
