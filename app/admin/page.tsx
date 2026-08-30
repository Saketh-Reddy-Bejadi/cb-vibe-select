import Link from "next/link";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import FolderForm from "./FolderForm";
import ScanButton from "./ScanButton";
import ProcessButton from "./ProcessButton";
import RetryButton from "./RetryButton";

export default async function AdminPage() {
  // proxy.ts already gates OWNER/ADMIN; auth() here is for display.
  const session = await auth();
  const folders = await prisma.folder.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { images: true } },
      jobs: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  const pendingCount = await prisma.image.count({ where: { status: "PENDING" } });
  const failedCount = await prisma.image.count({ where: { status: "FAILED" } });
  // Stuck PROCESSING (interrupted run) is also retryable.
  const retryableCount =
    failedCount + (await prisma.image.count({ where: { status: "PROCESSING" } }));

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <header className="flex items-start justify-between">
        <div>
          <Link href="/" className="text-sm font-bold text-cb-blue">
            PicScope
          </Link>
          <h1 className="mt-1 text-3xl font-semibold text-cb-text">Admin Panel</h1>
          <p className="mt-1 text-sm text-cb-text-muted">
            {session?.user?.email} · {session?.user?.role}
          </p>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button className="flex h-12 items-center rounded-2xl border border-cb-blue px-5 text-base font-bold text-cb-blue transition-colors duration-150 ease-out hover:bg-cb-blue-subtle">
            Sign out
          </button>
        </form>
      </header>

      <section className="mt-10 rounded-lg border border-cb-border p-6">
        <h2 className="text-xl font-medium text-cb-text">Add a folder</h2>
        <p className="mt-1 mb-5 text-sm text-cb-text-muted">
          Paste a folder link. PicScope resolves it via Microsoft Graph and registers it for indexing.
        </p>
        <FolderForm />
      </section>

      <section className="mt-6 flex items-center justify-between rounded-lg border border-cb-border p-6">
        <div>
          <h2 className="text-xl font-medium text-cb-text">Processing queue</h2>
          <p className="mt-1 text-sm text-cb-text-muted">
            {pendingCount === 0
              ? "No images waiting. Scan a folder to queue images."
              : `${pendingCount} image(s) waiting. Runs face detection + EXIF, then stores results.`}
            {failedCount > 0 && (
              <span className="text-red-600"> · {failedCount} failed</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {retryableCount > 0 && <RetryButton count={retryableCount} />}
          <ProcessButton />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-medium text-cb-text">
          Registered folders <span className="text-cb-text-muted">({folders.length})</span>
        </h2>
        {folders.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-cb-border p-6 text-sm text-cb-text-muted">
            No folders yet. Add one above to get started.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {folders.map((f) => (
              <li
                key={f.id}
                className="rounded-lg border border-cb-border p-4 transition-[border] duration-150 ease-out hover:border-2 hover:border-cb-border-hover"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-cb-text">
                      {f.name}
                      {f.isPublicOverride && (
                        <span className="ml-2 rounded-2xl bg-cb-blue-subtle px-2.5 py-0.5 text-xs font-medium text-cb-blue">
                          Public
                        </span>
                      )}
                    </p>
                    <a
                      href={f.webUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block truncate text-sm text-cb-blue hover:text-cb-blue-hover"
                    >
                      {f.webUrl}
                    </a>
                    <p className="mt-1 text-xs text-cb-text-muted">
                      {f._count.images} image(s) indexed
                      {f.jobs[0] && (
                        <>
                          {" · last job: "}
                          <span className="font-medium text-cb-text">{f.jobs[0].status}</span>
                          {" ("}
                          {f.jobs[0].processedItems}/{f.jobs[0].totalItems} processed
                          {f.jobs[0].failedItems > 0 && `, ${f.jobs[0].failedItems} failed`}
                          {")"}
                        </>
                      )}
                      {f.lastSyncedAt && ` · synced ${f.lastSyncedAt.toLocaleString()}`}
                    </p>
                  </div>
                  <ScanButton folderId={f.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
