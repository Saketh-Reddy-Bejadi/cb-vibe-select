import Link from "next/link";
import { ChevronLeft, Database, ScanFace, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { isArchived } from "@/lib/boxes";
import { needsHumanName } from "@/lib/people";
import { embeddingCoverage } from "@/lib/vectors";
import SiteHeader from "@/components/site-header";
import PersonRow, { type PersonSummary } from "./PersonRow";
import { UnknownFaceCard } from "./UnknownFaceCard";
import MatchButton from "./MatchButton";
import { type FaceBox } from "./FaceCrop";

// Never prerender: this reads live database state and calls the recognition
// backend. Without this Next tried to build it statically, since unlike the
// other admin pages it has no top-level auth() call to force it dynamic.
export const dynamic = "force-dynamic";

const WIDTH = "max-w-5xl";
/** Cap the unknown-face queue: it is a work list, not an archive. */
const UNKNOWN_LIMIT = 40;

export default async function PeoplePage() {
  // proxy.ts gates /admin to OWNER/ADMIN; the actions re-check independently.
  const [people, unknownFaces, doneCount] = await Promise.all([
    prisma.person.findMany({
      orderBy: [{ hidden: "asc" }, { name: "asc" }],
      include: {
        _count: { select: { faces: true } },
        faces: {
          take: 1,
          orderBy: { confidence: "desc" },
          include: { image: { select: { id: true, width: true, height: true } } },
        },
      },
    }),
    // Faces the collection could not identify — the queue worth naming.
    // Over-fetched because archived regions are filtered out below by overlap,
    // which SQL can't express; the visible list is trimmed to UNKNOWN_LIMIT.
    prisma.faceDetection.findMany({
      where: { personId: null, image: { width: { not: null }, height: { not: null } } },
      orderBy: { confidence: "desc" },
      take: UNKNOWN_LIMIT * 8,
      include: { image: { select: { id: true, width: true, height: true, fileName: true } } },
    }),
    prisma.image.count({ where: { status: "DONE" } }),
  ]);

  const coverage = await embeddingCoverage();

  // Boxes only: these filter the queue by overlap. The cards themselves live on
  // the collection page.
  const archived = await prisma.archivedFace.findMany({
    select: { imageId: true, boxX: true, boxY: true, boxWidth: true, boxHeight: true },
  });
  const archivedByImage = new Map<string, typeof archived>();
  for (const a of archived) {
    const list = archivedByImage.get(a.imageId);
    if (list) list.push(a);
    else archivedByImage.set(a.imageId, [a]);
  }

  const unknown = unknownFaces
    .filter((f) => !isArchived(f, archivedByImage.get(f.imageId) ?? []))
    .slice(0, UNKNOWN_LIMIT);

  const summaries: PersonSummary[] = people.map((p) => {
    const face = p.faces[0];
    const sample: FaceBox | null =
      face && face.image.width && face.image.height
        ? {
            imageId: face.image.id,
            imageWidth: face.image.width,
            imageHeight: face.image.height,
            boxX: face.boxX,
            boxY: face.boxY,
            boxWidth: face.boxWidth,
            boxHeight: face.boxHeight,
          }
        : null;
    return {
      id: p.id,
      externalId: p.externalId,
      name: p.name,
      hidden: p.hidden,
      needsName: needsHumanName(p.name, p.externalId),
      photoCount: p._count.faces,
      sample,
    };
  });

  const unnamedCount = summaries.filter((p) => p.needsName).length;

  return (
    <>
      <SiteHeader width={WIDTH} />
      <main id="main" className={`page flex-1 ${WIDTH}`}>
        <header className="mb-6 sm:mb-8">
          <Link href="/admin" className="btn btn-sm btn-tertiary -ml-3">
            <ChevronLeft className="h-4 w-4" aria-hidden />
            Admin
          </Link>
          <h1 className="t-h1 mt-2 text-cb-text">People &amp; faces</h1>
          <p className="t-small mt-1 max-w-2xl text-cb-text-muted">
            Renaming is display-only and sticks through re-scans. Enrolling and removing references
            change what the recognition collection matches — apply those with Sync &amp; match, which
            compares stored face vectors in the database rather than re-processing every photo.
          </p>
          <div className="mt-4 flex flex-col gap-3">
            <MatchButton doneCount={doneCount} total={coverage.total} withVector={coverage.withVector} />
            <Link href="/admin/people/collection" className="btn btn-sm btn-neutral self-start">
              <Database className="h-4 w-4" aria-hidden />
              Collection &amp; archive
            </Link>
          </div>
        </header>

        {/* ---- Unidentified faces: name them and teach the collection ---- */}
        <section className="mb-10">
          <h2 className="t-h4 flex items-center gap-2 text-cb-text">
            <ScanFace className="h-5 w-5 text-cb-blue" aria-hidden />
            Unidentified faces <span className="text-cb-text-muted">({unknown.length})</span>
          </h2>
          <p className="t-small mb-4 mt-1 text-cb-text-muted">
            Detected but matched to nobody. Naming one enrols it as a reference, so later photos
            recognise them.
          </p>

          {unknown.length === 0 ? (
            <div className="empty-state">
              <p className="t-body text-cb-text">Nothing unidentified</p>
              <p className="t-small max-w-sm text-cb-text-muted">
                Every detected face is either matched or archived.
              </p>
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {unknown.map((f) => (
                <UnknownFaceCard
                  key={f.id}
                  faceId={f.id}
                  fileName={f.image.fileName}
                  face={{
                    imageId: f.image.id,
                    imageWidth: f.image.width!,
                    imageHeight: f.image.height!,
                    boxX: f.boxX,
                    boxY: f.boxY,
                    boxWidth: f.boxWidth,
                    boxHeight: f.boxHeight,
                  }}
                />
              ))}
            </ul>
          )}
        </section>

        {/* ---- Known people ---- */}
        <section>
          <h2 className="t-h4 flex items-center gap-2 text-cb-text">
            <Users className="h-5 w-5 text-cb-blue" aria-hidden />
            People <span className="text-cb-text-muted">({summaries.length})</span>
          </h2>
          <p className="t-small mb-4 mt-1 max-w-2xl text-cb-text-muted">
            {unnamedCount > 0
              ? `${unnamedCount} still carry the raw id from the recognition backend — rename them to make search readable.`
              : "Everyone has a readable name."}
          </p>

          {summaries.length === 0 ? (
            <div className="empty-state">
              <p className="t-body text-cb-text">No people yet</p>
              <p className="t-small max-w-sm text-cb-text-muted">
                People appear once the queue matches a face against the collection.
              </p>
            </div>
          ) : (
            <ul className="grid gap-3 lg:grid-cols-2">
              {summaries.map((p) => (
                <PersonRow key={p.id} person={p} />
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
