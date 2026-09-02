import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { assignableRoles, canEdit, displayRole, visibleRoles } from "@/lib/roles";
import SiteHeader from "@/components/site-header";
import RoleSelect from "./RoleSelect";

const LABEL = { OWNER: "Owner", ADMIN: "Admin", USER: "User" } as const;
const OWNER_EMAIL = process.env.OWNER_EMAIL?.toLowerCase();
const WIDTH = "max-w-3xl";

export default async function UsersPage() {
  const session = await auth();
  const me = session?.user;
  // proxy gates /admin to OWNER/ADMIN; both may manage roles (scoped by hierarchy).
  if (!me?.id) redirect("/login");

  const options = assignableRoles(me.role);
  // Everyone is listed, but a rank above mine is displayed capped to my own
  // rank — an admin sees the owner as "Admin" and can't edit them either way.
  const users = await prisma.user.findMany({
    where: { role: { in: visibleRoles() } },
    orderBy: [{ role: "desc" }, { email: "asc" }],
  });

  return (
    <>
      <SiteHeader width={WIDTH} />
      <main id="main" className={`page flex-1 ${WIDTH}`}>
        <header className="mb-6 sm:mb-8">
          <Link href="/admin" className="btn btn-sm btn-tertiary -ml-3">
            <ChevronLeft className="h-4 w-4" aria-hidden />
            Admin
          </Link>
          <h1 className="t-h1 mt-2 text-cb-text">Users &amp; roles</h1>
          <p className="t-small mt-1 text-cb-text-muted">
            Assign access. You can grant roles up to your own level.
          </p>
        </header>

        <ul className="flex flex-col gap-3">
          {users.map((u) => {
            const editable =
              u.id !== me.id && u.email.toLowerCase() !== OWNER_EMAIL && canEdit(me.role, u.role);
            const shown = displayRole(me.role, u.role);
            return (
              <li
                key={u.id}
                className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    aria-hidden
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cb-blue-subtle text-sm font-bold text-cb-blue-700"
                  >
                    {(u.name ?? u.email).charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="t-body truncate font-semibold text-cb-text">
                      {u.name ?? u.email}
                    </p>
                    <p className="t-small truncate text-cb-text-muted">{u.email}</p>
                  </div>
                </div>
                <div className="shrink-0 sm:pl-4">
                  {editable ? (
                    <RoleSelect userId={u.id} current={u.role} options={options} />
                  ) : (
                    <span className="chip chip-blue">
                      {LABEL[shown]}
                      {u.id === me.id && " · you"}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </main>
    </>
  );
}
