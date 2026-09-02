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
        aria-label="Role"
        defaultValue={current}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="field w-full cursor-pointer pr-3 sm:w-auto"
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
