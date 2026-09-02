"use client";

import { useActionState } from "react";
import { RefreshCw } from "lucide-react";
import { requeueFolder, type ScanState } from "./actions";
import { Spinner } from "@/components/spinner";

const initial: ScanState = {};

/**
 * Put one folder's finished images back on the queue.
 *
 * Distinct from Scan/Rescan, which only picks up files that are new to us —
 * this reprocesses what is already indexed, which is what applies newly enrolled
 * faces to photos the worker has already seen.
 */
export default function RequeueButton({ folderId, count }: { folderId: string; count: number }) {
  const [state, action, pending] = useActionState(requeueFolder, initial);

  return (
    <form action={action} className="flex flex-col items-start gap-1.5 sm:items-end">
      <input type="hidden" name="folderId" value={folderId} />
      <button
        disabled={pending || count === 0}
        className="btn btn-sm btn-neutral"
        title="Reprocess this folder's already-indexed images"
      >
        {pending ? <Spinner className="h-3.5 w-3.5" /> : <RefreshCw className="h-4 w-4" aria-hidden />}
        {pending ? "Queueing…" : `Re-index ${count}`}
      </button>
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
