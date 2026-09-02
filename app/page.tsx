import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { visibleImageWhere } from "@/lib/permissions";
import SiteHeader from "@/components/site-header";
import PhotoGrid, { type Filters } from "./PhotoGrid";
import FilterBar from "./FilterBar";

type SP = { [key: string]: string | string[] | undefined };

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function Home({ searchParams }: { searchParams: Promise<SP> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const role = session.user.role;
  const userId = session.user.id;

  const sp = await searchParams;
  const filters: Filters = {
    peopleIds: (first(sp.people) ?? "").split(",").filter(Boolean),
    folderId: first(sp.folder) || undefined,
    from: first(sp.from) || undefined,
    to: first(sp.to) || undefined,
  };

  // Only what the filter bar needs. These are small indexed lookups and don't
  // depend on the active filters, so the chrome can paint while the (much
  // larger) photo query streams in behind its own boundary below.
  const base = await visibleImageWhere({ id: userId, role });
  const [persons, folders] = await Promise.all([
    prisma.person.findMany({
      where: { faces: { some: { image: base } } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.folder.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <SiteHeader />
      <main id="main" className="page max-w-6xl flex-1">
        <div className="mb-6 sm:mb-8">
          <h1 className="t-h1 text-cb-text">Discover</h1>
          <p className="t-body mt-1 text-cb-text-muted">
            Search your Microsoft 365 photo libraries by person, folder and date.
          </p>
        </div>

        <FilterBar
          persons={persons}
          folders={folders}
          selected={{
            people: filters.peopleIds,
            folder: filters.folderId ?? "",
            from: filters.from ?? "",
            to: filters.to ?? "",
          }}
        />

        {/* No placeholder: the grid is the last element, so nothing shifts while
            it resolves, and each tile shows its own spinner once it exists.
            Unkeyed on purpose — a filter change keeps the current photos on
            screen until the new ones arrive rather than flashing an empty page. */}
        <Suspense fallback={null}>
          <PhotoGrid userId={userId} role={role} filters={filters} />
        </Suspense>
      </main>
    </>
  );
}
