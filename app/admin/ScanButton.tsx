"use client";

import { useActionState, useId } from "react";
import { scanFolder, type ScanState } from "./actions";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/spinner";

const initial: ScanState = {};

export default function ScanButton({ folderId, synced }: { folderId: string; synced?: boolean }) {
  const [state, formAction, pending] = useActionState(scanFolder, initial);
  const label = synced ? "Rescan" : "Scan";
  const id = useId();

  return (
    <form action={formAction} className="flex flex-col items-start gap-1.5 sm:items-end">
      <input type="hidden" name="folderId" value={folderId} />
      <div className="flex items-center gap-3">
        <Label
          htmlFor={id}
          className="t-small flex cursor-pointer items-center gap-2 font-medium leading-normal text-cb-text"
        >
          {/* value="on" matches the native default the server action tests for. */}
          <Checkbox id={id} name="recursive" value="on" defaultChecked className="size-[18px]" />
          Subfolders
        </Label>
        <button disabled={pending} className="btn btn-sm btn-secondary">
          {pending && <Spinner className="h-3.5 w-3.5" />}
          {pending ? "Scanning…" : label}
        </button>
      </div>
      <div aria-live="polite" className="empty:hidden text-right">
        {state.error && (
          <p role="alert" className="note note-error">
            {state.error}
          </p>
        )}
        {state.ok && <p className="note note-ok">{state.ok}</p>}
      </div>
    </form>
  );
}
