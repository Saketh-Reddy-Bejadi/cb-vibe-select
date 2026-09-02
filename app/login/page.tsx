import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { auth, signIn } from "@/auth";
import { Logo } from "@/components/logo";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <main
      id="main"
      className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6 sm:py-20"
    >
      <div className="card animate-rise w-full max-w-md p-6 sm:p-8">
        <Logo size={32} />

        <h1 className="t-display mt-6 text-cb-text">Enabling Careers</h1>
        <p className="t-body mt-3 text-cb-text-muted">
          Enterprise visual intelligence for your Microsoft 365 photo libraries.
        </p>

        <form
          action={async () => {
            "use server";
            await signIn("microsoft-entra-id", { redirectTo: "/" });
          }}
          className="mt-8"
        >
          <button type="submit" className="btn btn-lg btn-primary btn-block">
            Sign in with Microsoft
            <ArrowRight data-arrow className="h-4 w-4" aria-hidden />
          </button>
        </form>

        <p className="t-small mt-4 text-cb-text-muted">
          Use your <b>codebasics.io</b> work account.
        </p>
      </div>
    </main>
  );
}
