"use client";

import type { Role } from "@prisma/client";
import { setUserRole } from "../actions";

const LABEL: Record<Role, string> = { OWNER: "Owner", ADMIN: "Admin", USER: "User" };

// Submits on change — no separate save button.
export default function RoleSelect({
  userId,
  current,
  options,
}: {
  userId: string;
  current: Role;
  options: Role[];
}) {
  return (
    <form action={setUserRole}>
      <input type="hidden" name="userId" value={userId} />
      <select
        name="role"
        defaultValue={current}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="h-9 rounded-2xl border border-cb-border bg-white px-3 text-sm font-medium text-cb-text outline-none transition-colors duration-150 ease-out hover:border-cb-border-hover focus:border-cb-blue"
      >
        {options.map((r) => (
          <option key={r} value={r}>
            {LABEL[r]}
          </option>
        ))}
      </select>
    </form>
  );
}
