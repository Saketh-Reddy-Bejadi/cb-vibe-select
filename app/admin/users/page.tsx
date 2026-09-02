import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { assignableRoles, canEdit, visibleRoles } from "@/lib/roles";
import RoleSelect from "./RoleSelect";

const LABEL = { OWNER: "Owner", ADMIN: "Admin", USER: "User" } as const;
const OWNER_EMAIL = process.env.OWNER_EMAIL?.toLowerCase();

export default async function UsersPage() {
  const session = await auth();
  const me = session?.user;
  // proxy gates /admin to OWNER/ADMIN; both may manage roles (scoped by hierarchy).
  if (!me?.id) redirect("/login");

  const options = assignableRoles(me.role);
  // Only users at my rank or below — admins never see owners.
  const users = await prisma.user.findMany({
    where: { role: { in: visibleRoles(me.role) } },
    orderBy: [{ role: "desc" }, { email: "asc" }],
  });

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <header className="mb-8">
        <Link href="/admin" className="text-sm font-bold text-cb-blue">
          ← Admin
        </Link>
        <h1 className="mt-1 text-3xl font-semibold text-cb-text">Users &amp; roles</h1>
        <p className="mt-1 text-sm text-cb-text-muted">
          Assign access. You can grant roles up to your own level.
        </p>
      </header>

      <ul className="flex flex-col gap-3">
        {users.map((u) => {
          const editable =
            u.id !== me.id && u.email.toLowerCase() !== OWNER_EMAIL && canEdit(me.role, u.role);
          return (
            <li
              key={u.id}
              className="flex items-center justify-between gap-4 rounded-lg border border-cb-border p-4"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-cb-text">{u.name ?? u.email}</p>
                <p className="truncate text-sm text-cb-text-muted">{u.email}</p>
              </div>
              {editable ? (
                <RoleSelect userId={u.id} current={u.role} options={options} />
              ) : (
                <span className="rounded-2xl bg-cb-blue-subtle px-3 py-1 text-sm font-medium text-cb-blue">
                  {LABEL[u.role]}
                  {u.id === me.id && " (you)"}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
