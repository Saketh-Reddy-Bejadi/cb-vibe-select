"use client";

import { useActionState } from "react";
import { scanFolder, type ScanState } from "./actions";
import { Spinner } from "@/components/spinner";

const initial: ScanState = {};

export default function ScanButton({ folderId }: { folderId: string }) {
  const [state, formAction, pending] = useActionState(scanFolder, initial);

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="folderId" value={folderId} />
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1.5 text-sm font-medium text-cb-text">
          <input name="recursive" type="checkbox" defaultChecked className="h-4 w-4 accent-cb-blue" />
          Subfolders
        </label>
        <button
          disabled={pending}
          className="flex h-10 items-center gap-2 rounded-2xl border border-cb-blue px-4 text-sm font-bold text-cb-blue transition-colors duration-150 ease-out hover:bg-cb-blue-subtle disabled:border-cb-border disabled:text-cb-text-muted"
        >
          {pending && <Spinner />}
          {pending ? "Scanning…" : "Scan"}
        </button>
      </div>
      {state.error && <p className="text-xs font-medium text-red-600">{state.error}</p>}
      {state.ok && <p className="text-xs font-medium text-cb-blue">{state.ok}</p>}
    </form>
  );
}
