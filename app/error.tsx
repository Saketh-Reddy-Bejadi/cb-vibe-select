"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main
      id="main"
      className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6 sm:py-24"
    >
      <div className="card animate-rise w-full max-w-md p-6 text-center sm:p-8" role="alert">
        <span
          aria-hidden
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-cb-blue-subtle text-cb-blue"
        >
          <AlertTriangle className="h-5 w-5" />
        </span>
        <h1 className="t-h3 mt-4 text-cb-text">Something went wrong</h1>
        <p className="t-small mt-2 text-cb-text-muted">
          An unexpected error occurred. Try again, and if it keeps happening, contact your admin.
        </p>
        <button onClick={reset} className="btn btn-lg btn-primary btn-block mt-6">
          <RotateCcw data-arrow className="h-4 w-4" aria-hidden />
          Try again
        </button>
      </div>
    </main>
  );
}
