import Link from "next/link";
import { ExternalLink, FolderPlus, Users } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getPermissionMode } from "@/lib/settings";
import SiteHeader from "@/components/site-header";
import { updatePermissionMode, toggleFolderPublic } from "./actions";
import FolderForm from "./FolderForm";
import ScanButton from "./ScanButton";
import ProcessButton from "./ProcessButton";
import RetryButton from "./RetryButton";

const WIDTH = "max-w-3xl";

export default async function AdminPage() {
  // proxy.ts already gates OWNER/ADMIN; auth() here is for display.
  const session = await auth();
  const isOwner = session?.user?.role === "OWNER";
  const permissionMode = await getPermissionMode();
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
    <>
      <SiteHeader width={WIDTH} />
      <main id="main" className={`page flex-1 ${WIDTH}`}>
        <header className="mb-6 sm:mb-8">
          <h1 className="t-h1 text-cb-text">Admin panel</h1>
          <p className="t-small mt-1 text-cb-text-muted">
            {session?.user?.email} · {session?.user?.role}
          </p>
          <Link href="/admin/users" className="btn btn-neutral mt-4">
            <Users className="h-4 w-4" aria-hidden />
            Users &amp; roles
          </Link>
        </header>

        <div className="flex flex-col gap-4 sm:gap-5">
          {isOwner && (
            <section className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-6">
              <div className="min-w-0">
                <h2 className="t-h4 text-cb-text">Permission mode</h2>
                <p className="t-small mt-1 max-w-md text-cb-text-muted">
                  {permissionMode === "OPEN"
                    ? "Open — all authenticated employees can discover every indexed photo."
                    : "Strict — users see only public folders and folders they added. Admins see all."}
                </p>
              </div>
              <div className="segmented self-start sm:self-auto" role="group" aria-label="Permission mode">
                {(["OPEN", "STRICT"] as const).map((mode) => (
                  <form key={mode} action={updatePermissionMode}>
                    <input type="hidden" name="mode" value={mode} />
                    {/* aria-pressed carries the state — not colour alone. */}
                    <button
                      type="submit"
                      className="segment"
                      aria-pressed={permissionMode === mode}
                    >
                      {mode === "OPEN" ? "Open" : "Strict"}
                    </button>
                  </form>
                ))}
              </div>
            </section>
          )}

          <section className="card p-5 sm:p-6">
            <h2 className="t-h4 flex items-center gap-2 text-cb-text">
              <FolderPlus className="h-5 w-5 text-cb-blue" aria-hidden />
              Add a folder
            </h2>
            <p className="t-small mb-5 mt-1 text-cb-text-muted">
              Paste a folder link. PicScope resolves it via Microsoft Graph and registers it for
              indexing.
            </p>
            <FolderForm />
          </section>

          <section className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-6">
            <div className="min-w-0">
              <h2 className="t-h4 text-cb-text">Processing queue</h2>
              <p className="t-small mt-1 text-cb-text-muted">
                {pendingCount === 0
                  ? "No images waiting. Scan a folder to queue images."
                  : `${pendingCount} image(s) waiting. Runs face detection + EXIF, then stores results.`}
              </p>
              {failedCount > 0 && (
                <p className="note note-error mt-2">{failedCount} image(s) failed to process</p>
              )}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              {retryableCount > 0 && <RetryButton count={retryableCount} />}
              <ProcessButton />
            </div>
          </section>
        </div>

        <section className="mt-10">
          <h2 className="t-h4 text-cb-text">
            Registered folders <span className="text-cb-text-muted">({folders.length})</span>
          </h2>
          {folders.length === 0 ? (
            <div className="empty-state mt-4">
              <p className="t-body text-cb-text">No folders yet</p>
              <p className="t-small max-w-sm text-cb-text-muted">
                Add one above to start indexing photos.
              </p>
            </div>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {folders.map((f) => (
                <li key={f.id} className="card card-interactive p-4 sm:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="t-body truncate font-semibold text-cb-text">{f.name}</p>
                      <a
                        href={f.webUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="t-small mt-0.5 flex items-center gap-1 rounded text-cb-blue transition-colors duration-150 ease-out hover:text-cb-blue-hover hover:underline"
                      >
                        <span className="truncate">{f.webUrl}</span>
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      </a>
                      <p className="t-small mt-2 text-cb-text-muted">
                        {f._count.images} image(s) indexed
                        {f.jobs[0] && (
                          <>
                            {" · last job: "}
                            <span className="font-semibold text-cb-text">{f.jobs[0].status}</span>
                            {" ("}
                            {f.jobs[0].processedItems}/{f.jobs[0].totalItems} processed
                            {f.jobs[0].failedItems > 0 && `, ${f.jobs[0].failedItems} failed`}
                            {")"}
                          </>
                        )}
                        {f.lastSyncedAt && ` · synced ${f.lastSyncedAt.toLocaleString()}`}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-start gap-3 sm:flex-col sm:items-end">
                      <form action={toggleFolderPublic}>
                        <input type="hidden" name="folderId" value={f.id} />
                        <button
                          type="submit"
                          aria-pressed={f.isPublicOverride}
                          className={`btn btn-sm ${
                            f.isPublicOverride ? "btn-secondary bg-cb-blue-subtle" : "btn-neutral"
                          }`}
                        >
                          {f.isPublicOverride ? "Public" : "Make public"}
                        </button>
                      </form>
                      <ScanButton folderId={f.id} synced={!!f.lastSyncedAt} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
