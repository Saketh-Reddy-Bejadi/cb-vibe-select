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
  const router = useRouter();

  function run() {
    setRunning(true);
    setStatus("Starting…");
    const es = new EventSource("/api/worker/stream");

    es.onmessage = (msg) => {
      const e: Ev = JSON.parse(msg.data);
      if (e.type === "start") {
        setStatus(e.total === 0 ? "Queue is empty." : `0/${e.total}…`);
      } else if (e.type === "progress") {
        const done = e.processed + e.failed;
        setStatus(`${done}/${e.total} — ${e.currentFile ?? ""}${e.failed ? ` (${e.failed} failed)` : ""}`);
      } else if (e.type === "done") {
        setStatus(`Done: ${e.processed} processed${e.failed ? `, ${e.failed} failed` : ""}.`);
        es.close();
        setRunning(false);
        router.refresh();
      } else if (e.type === "error") {
        setStatus(`Error: ${e.message}`);
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
        setStatus((s) => s || "Connection lost.");
        router.refresh();
      }
    };
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={run}
        disabled={running}
        className="flex h-12 items-center gap-2 rounded-2xl bg-cb-blue px-5 text-base font-bold text-white transition-colors duration-150 ease-out hover:bg-cb-blue-hover disabled:bg-cb-blue-subtle disabled:text-white/70"
      >
        {running && <Spinner />}
        {running ? "Processing…" : "Process queue"}
      </button>
      {status && <p className="max-w-[16rem] truncate text-xs font-medium text-cb-blue">{status}</p>}
    </div>
  );
}
