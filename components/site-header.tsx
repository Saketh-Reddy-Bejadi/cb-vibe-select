import Link from "next/link";
import { auth, signOut } from "@/auth";
import { Logo } from "@/components/logo";

/**
 * Sticky top bar shared by every signed-in screen. Translucent material over a
 * hairline border rather than a shadow — the app keeps one persistent, familiar
 * place for identity and global actions.
 */
export default async function SiteHeader({ width = "max-w-6xl" }: { width?: string }) {
  const session = await auth();
  const role = session?.user?.role;
  const isAdmin = role === "OWNER" || role === "ADMIN";

  return (
    <header className="sticky top-0 z-40 border-b border-cb-border bg-white/85 backdrop-blur-md supports-[not(backdrop-filter:blur(0))]:bg-white">
      <div
        className={`mx-auto flex h-16 w-full items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 ${width}`}
      >
        <Link href="/" aria-label="PicScope home" className="group/logo rounded-lg">
          <Logo size={24} />
        </Link>

        <nav aria-label="Account" className="flex items-center gap-1.5 sm:gap-2">
          {isAdmin && (
            <Link href="/admin" className="btn btn-sm btn-tertiary">
              Admin
            </Link>
          )}
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button type="submit" className="btn btn-sm btn-neutral">
              Sign out
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
