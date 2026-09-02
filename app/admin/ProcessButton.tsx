"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/spinner";

type Ev =
  | { type: "start" | "progress" | "done"; total: number; processed: number; failed: number; currentFile?: string }
  | { type: "error"; message: string };

export default function ProcessButton() {
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("");
  // Determinate progress once the queue size is known — HIG prefers a real
  // measure over an indefinite spinner whenever the total is available.
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const router = useRouter();

  function run() {
    setRunning(true);
    setStatus("Starting…");
    setProgress(null);
    const es = new EventSource("/api/worker/stream");

    es.onmessage = (msg) => {
      const e: Ev = JSON.parse(msg.data);
      if (e.type === "start") {
        setStatus(e.total === 0 ? "Queue is empty." : `0/${e.total}…`);
        if (e.total > 0) setProgress({ done: 0, total: e.total });
      } else if (e.type === "progress") {
        const done = e.processed + e.failed;
        setProgress({ done, total: e.total });
        setStatus(`${done}/${e.total} — ${e.currentFile ?? ""}${e.failed ? ` (${e.failed} failed)` : ""}`);
      } else if (e.type === "done") {
        setStatus(`Done: ${e.processed} processed${e.failed ? `, ${e.failed} failed` : ""}.`);
        setProgress(null);
        es.close();
        setRunning(false);
        router.refresh();
      } else if (e.type === "error") {
        setStatus(`Error: ${e.message}`);
        setProgress(null);
        es.close();
        setRunning(false);
        router.refresh();
      }
    };

    // Fires on normal stream close too; guarded so it doesn't overwrite a real result or reconnect.
    es.onerror = () => {
      es.close();
      if (running) {
        setRunning(false);
        setProgress(null);
        setStatus((s) => s || "Connection lost.");
        router.refresh();
      }
    };
  }

  const pct = progress && progress.total > 0 ? (progress.done / progress.total) * 100 : 0;

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
      <button onClick={run} disabled={running} className="btn btn-primary btn-block sm:w-auto">
        {running && <Spinner />}
        {running ? "Processing…" : "Process queue"}
      </button>

      {progress && (
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={progress.total}
          aria-valuenow={progress.done}
          aria-label="Processing queue"
          className="h-1.5 w-full overflow-hidden rounded-full bg-cb-blue-subtle sm:w-56"
        >
          <div
            className="h-full rounded-full bg-cb-blue transition-[width] duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {status && (
        <p
          aria-live="polite"
          className="t-small w-full truncate text-cb-text-muted sm:w-56 sm:text-right"
          title={status}
        >
          {status}
        </p>
      )}
    </div>
  );
}
