"use client";

import { useActionState } from "react";
import Link from "next/link";
import { RefreshCw, Sparkles } from "lucide-react";
import { Spinner } from "@/components/spinner";
import { rematchAll, syncAndMatch, type PeopleState } from "./actions";

const initial: PeopleState = {};

/**
 * Two paths, deliberately not equivalent. Matching locally is the one to reach
 * for; re-indexing exists to backfill vectors and is presented as the fallback
 * because it costs a download and a detection per image.
 */
export default function MatchButton({
  doneCount,
  total,
  withVector,
}: {
  doneCount: number;
  total: number;
  withVector: number;
}) {
  const [matchState, match, matching] = useActionState(() => syncAndMatch(), initial);
  const [indexState, reindex, indexing] = useActionState(() => rematchAll(), initial);
  const missing = total - withVector;

  return (
    <div className="card flex flex-col gap-3 p-4">
      <div>
        <h2 className="t-h4 text-cb-text">Apply the collection</h2>
        <p className="t-small mt-1 text-cb-text-muted">
          {missing === 0 && total > 0
            ? "Every face has a stored vector, so matching runs entirely in the database."
            : `${withVector} of ${total} faces have a stored vector. The rest were indexed before vectors were kept and need one re-index to become matchable.`}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <form action={match}>
          <button className="btn btn-sm btn-primary" disabled={matching || indexing}>
            {matching ? <Spinner className="h-3.5 w-3.5" /> : <Sparkles className="h-4 w-4" aria-hidden />}
            {matching ? "Matching…" : "Sync & match"}
          </button>
        </form>

        <form action={reindex}>
          <button
            className="btn btn-sm btn-neutral"
            disabled={matching || indexing || doneCount === 0}
            title="Downloads and re-detects every image — only needed to backfill vectors or after changing detector settings"
          >
            {indexing ? <Spinner className="h-3.5 w-3.5" /> : <RefreshCw className="h-4 w-4" aria-hidden />}
            {indexing ? "Queueing…" : `Re-index ${doneCount} photo${doneCount === 1 ? "" : "s"}`}
          </button>
        </form>
      </div>

      <div aria-live="polite" className="empty:hidden">
        {(matchState.error || indexState.error) && (
          <p role="alert" className="note note-error">
            {matchState.error ?? indexState.error}
          </p>
        )}
        {(matchState.ok || indexState.ok) && (
          <p className="note note-ok">
            {matchState.ok ?? indexState.ok}
            {indexState.ok && (
              <>
                {" "}
                <Link href="/admin" className="font-bold underline underline-offset-2">
                  Go to Admin
                </Link>
              </>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
