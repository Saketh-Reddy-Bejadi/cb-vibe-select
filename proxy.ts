import { auth } from "@/auth";
import { NextResponse } from "next/server";

// Gate the admin area: must be signed in AND OWNER/ADMIN. Owner is superuser.
// ponytail: role UI is Phase 4; until then OWNER (from OWNER_EMAIL) is the only admin.
export default auth((req) => {
  const role = req.auth?.user?.role;
  const isAdmin = role === "OWNER" || role === "ADMIN";
  if (!isAdmin) {
    const url = new URL("/", req.nextUrl.origin);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*"],
};
