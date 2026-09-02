"use client";

import { useActionState } from "react";
import { retryFailed, type WorkerState } from "./actions";
import { Spinner } from "@/components/spinner";

const initial: WorkerState = {};

export default function RetryButton({ count }: { count: number }) {
  const [state, formAction, pending] = useActionState(retryFailed, initial);

  return (
    <form action={formAction} className="flex w-full flex-col gap-1.5 sm:w-auto sm:items-end">
      <button disabled={pending} className="btn btn-secondary btn-block sm:w-auto">
        {pending && <Spinner />}
        {pending ? "Re-queuing…" : `Retry failed (${count})`}
      </button>
      <div aria-live="polite" className="empty:hidden">
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
