import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-lg border border-cb-border p-8">
        <p className="text-xs font-medium uppercase tracking-[0.04em] text-cb-blue">
          Enabling Careers
        </p>
        <h1 className="mt-2 text-4xl font-bold leading-tight text-cb-text">PicScope</h1>
        <p className="mt-3 text-base font-medium leading-relaxed text-cb-text">
          Enterprise visual intelligence for your Microsoft 365 photo libraries.
        </p>
        <form
          action={async () => {
            "use server";
            await signIn("microsoft-entra-id", { redirectTo: "/" });
          }}
          className="mt-8"
        >
          <button className="flex h-12 w-full items-center justify-center rounded-2xl bg-cb-blue px-6 text-base font-bold text-white transition-colors duration-150 ease-out hover:bg-cb-blue-hover">
            Sign in with Microsoft
          </button>
        </form>
      </div>
    </main>
  );
}
