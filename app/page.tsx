import Link from "next/link";
import { auth, signIn, signOut } from "@/auth";

export default async function Home() {
  const session = await auth();
  const role = session?.user?.role;
  const isAdmin = role === "OWNER" || role === "ADMIN";

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-lg border border-cb-border p-8 transition-[border] duration-150 ease-out hover:border-2 hover:border-cb-border-hover">
        <p className="text-xs font-medium uppercase tracking-[0.04em] text-cb-blue">
          Enabling Careers
        </p>
        <h1 className="mt-2 text-4xl font-bold leading-tight text-cb-text">PicScope</h1>
        <p className="mt-3 text-base font-medium leading-relaxed text-cb-text">
          Enterprise visual intelligence for your Microsoft 365 photo libraries.
        </p>

        {session?.user ? (
          <div className="mt-8">
            <p className="text-sm text-cb-text-muted">
              Signed in as{" "}
              <span className="font-medium text-cb-text">{session.user.email}</span>
              {" · "}
              <span className="font-medium text-cb-text">{role}</span>
            </p>
            <div className="mt-4 flex items-center gap-3">
              {isAdmin && (
                <Link
                  href="/admin"
                  className="flex h-12 items-center rounded-2xl bg-cb-blue px-6 text-base font-bold text-white transition-colors duration-150 ease-out hover:bg-cb-blue-hover"
                >
                  Open Admin Panel
                </Link>
              )}
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button className="flex h-12 items-center rounded-2xl border border-cb-blue px-6 text-base font-bold text-cb-blue transition-colors duration-150 ease-out hover:bg-cb-blue-subtle">
                  Sign out
                </button>
              </form>
            </div>
          </div>
        ) : (
          <form
            action={async () => {
              "use server";
              await signIn("microsoft-entra-id", { redirectTo: "/admin" });
            }}
            className="mt-8"
          >
            <button className="flex h-12 w-full items-center justify-center rounded-2xl bg-cb-blue px-6 text-base font-bold text-white transition-colors duration-150 ease-out hover:bg-cb-blue-hover">
              Sign in with Microsoft
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
