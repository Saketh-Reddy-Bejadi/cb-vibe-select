"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-24">
      <div className="w-full max-w-md rounded-lg border border-cb-border p-8 text-center">
        <h1 className="text-2xl font-semibold text-cb-text">Something went wrong</h1>
        <p className="mt-2 text-sm text-cb-text-muted">
          An unexpected error occurred. Try again, and if it keeps happening, contact your admin.
        </p>
        <button
          onClick={reset}
          className="mt-6 inline-flex h-12 items-center rounded-2xl bg-cb-blue px-6 text-base font-bold text-white transition-colors duration-150 ease-out hover:bg-cb-blue-hover"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
