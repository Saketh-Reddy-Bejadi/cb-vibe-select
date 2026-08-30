"use client";

import { useActionState } from "react";
import { retryFailed, type WorkerState } from "./actions";
import { Spinner } from "@/components/spinner";

const initial: WorkerState = {};

export default function RetryButton({ count }: { count: number }) {
  const [state, formAction, pending] = useActionState(retryFailed, initial);

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <button
        disabled={pending}
        className="flex h-12 items-center gap-2 rounded-2xl border border-cb-blue px-5 text-base font-bold text-cb-blue transition-colors duration-150 ease-out hover:bg-cb-blue-subtle disabled:border-cb-border disabled:text-cb-text-muted"
      >
        {pending && <Spinner />}
        {pending ? "Re-queuing…" : `Retry failed (${count})`}
      </button>
      {state.error && <p className="text-xs font-medium text-red-600">{state.error}</p>}
      {state.ok && <p className="text-xs font-medium text-cb-blue">{state.ok}</p>}
    </form>
  );
}
