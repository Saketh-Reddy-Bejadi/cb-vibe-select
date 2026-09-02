import Link from "next/link";
import { Archive, ChevronLeft, Database } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { listEnrolledFaces, type EnrolledFace } from "@/lib/faces";
import SiteHeader from "@/components/site-header";
import { ArchivedFaceCard } from "../UnknownFaceCard";
import EnrolledFaceRow from "../EnrolledFaceRow";

// Reads live database state and calls the recognition backend on every view.
export const dynamic = "force-dynamic";

const WIDTH = "max-w-5xl";

/**
 * Reference material, split out from the day-to-day queue: what the backend can
 * recognise, and what an admin has dismissed. Both are things you audit
 * occasionally, not things you work through.
 */
export default async function CollectionPage() {
  const archived = await prisma.archivedFace.findMany({
    orderBy: { createdAt: "desc" },
    include: { image: { select: { id: true, width: true, height: true, fileName: true } } },
  });

  // The Space is the source of truth for what is enrolled; if it is unreachable
  // say so rather than rendering an empty list that implies nothing is enrolled.
  let enrolled: EnrolledFace[] = [];
  let enrolledError: string | null = null;
  try {
    enrolled = await listEnrolledFaces();
  } catch (e) {
    enrolledError = e instanceof Error ? e.message : String(e);
  }

  const byIdentity = new Map<string, number>();
  for (const f of enrolled) {
    const key = f.external_id ?? "(no identity)";
    byIdentity.set(key, (byIdentity.get(key) ?? 0) + 1);
  }

  return (
    <>
      <SiteHeader width={WIDTH} />
      <main id="main" className={`page flex-1 ${WIDTH}`}>
        <header className="mb-6 sm:mb-8">
          <Link href="/admin/people" className="btn btn-sm btn-tertiary -ml-3">
            <ChevronLeft className="h-4 w-4" aria-hidden />
            People &amp; faces
          </Link>
          <h1 className="t-h1 mt-2 text-cb-text">Collection &amp; archive</h1>
          <p className="t-small mt-1 max-w-2xl text-cb-text-muted">
            The reference faces the backend matches against, and the detections dismissed from the
            queue. Deleting a reference changes recognition; archiving never does.
          </p>
        </header>

        <section className="mb-10">
          <h2 className="t-h4 flex items-center gap-2 text-cb-text">
            <Database className="h-5 w-5 text-cb-blue" aria-hidden />
            Enrolled references <span className="text-cb-text-muted">({enrolled.length})</span>
          </h2>
          <p className="t-small mb-4 mt-1 max-w-2xl text-cb-text-muted">
            One person can hold several; deleting all of them is what stops recognition. Apply any
            change with Sync &amp; match.
          </p>

          {enrolledError ? (
            <p role="alert" className="note note-error">
              Couldn&apos;t reach the recognition backend: {enrolledError}
            </p>
          ) : enrolled.length === 0 ? (
            <div className="empty-state">
              <p className="t-body text-cb-text">Collection is empty</p>
              <p className="t-small max-w-sm text-cb-text-muted">
                Nothing is enrolled, so no face can be identified.
              </p>
            </div>
          ) : (
            <>
              <ul className="mb-4 flex flex-wrap gap-2">
                {[...byIdentity.entries()]
                  .sort((a, b) => b[1] - a[1])
                  .map(([id, n]) => (
                    <li key={id} className="chip chip-blue">
                      {id}
                      <span className="opacity-70">×{n}</span>
                    </li>
                  ))}
              </ul>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {enrolled.map((f) => (
                  <EnrolledFaceRow key={f.face_id} face={f} />
                ))}
              </ul>
            </>
          )}
        </section>

        <section>
          <h2 className="t-h4 flex items-center gap-2 text-cb-text">
            <Archive className="h-5 w-5 text-cb-text-muted" aria-hidden />
            Archived <span className="text-cb-text-muted">({archived.length})</span>
          </h2>
          <p className="t-small mb-4 mt-1 max-w-2xl text-cb-text-muted">
            Hidden from the queue and from photos. Nothing was deleted and recognition is unaffected
            — restore any of these at any time.
          </p>

          {archived.length === 0 ? (
            <div className="empty-state">
              <p className="t-body text-cb-text">Nothing archived</p>
              <p className="t-small max-w-sm text-cb-text-muted">
                Dismiss a face from the unidentified queue and it will appear here.
              </p>
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {archived
                .filter((a) => a.image.width && a.image.height)
                .map((a) => (
                  <ArchivedFaceCard
                    key={a.id}
                    archivedId={a.id}
                    fileName={a.image.fileName}
                    face={{
                      imageId: a.image.id,
                      imageWidth: a.image.width!,
                      imageHeight: a.image.height!,
                      boxX: a.boxX,
                      boxY: a.boxY,
                      boxWidth: a.boxWidth,
                      boxHeight: a.boxHeight,
                    }}
                  />
                ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
