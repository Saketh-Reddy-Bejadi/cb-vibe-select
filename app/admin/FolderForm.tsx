"use client";

import { useActionState } from "react";
import { addFolder, type FolderFormState } from "./actions";
import { Spinner } from "@/components/spinner";

const initial: FolderFormState = {};

export default function FolderForm() {
  const [state, formAction, pending] = useActionState(addFolder, initial);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="text-xs font-medium uppercase tracking-[0.04em] text-cb-text-muted">
        SharePoint / OneDrive folder link
      </label>
      <input
        name="url"
        type="url"
        required
        placeholder="https://contoso.sharepoint.com/sites/Marketing/Shared%20Documents/Offsite"
        className="h-12 rounded-2xl border border-cb-border px-4 text-base font-medium text-cb-text outline-none transition-colors duration-150 ease-out focus:border-cb-blue"
      />
      <label className="flex items-center gap-2 text-sm font-medium text-cb-text">
        <input name="isPublicOverride" type="checkbox" className="h-4 w-4 accent-cb-blue" />
        Publicly discoverable company-wide (per-folder override)
      </label>

      <button
        disabled={pending}
        className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-cb-blue px-6 text-base font-bold text-white transition-colors duration-150 ease-out hover:bg-cb-blue-hover disabled:bg-cb-blue-subtle disabled:text-white/70"
      >
        {pending && <Spinner />}
        {pending ? "Resolving…" : "Resolve & Add Folder"}
      </button>

      {state.error && <p className="text-sm font-medium text-red-600">{state.error}</p>}
      {state.ok && <p className="text-sm font-medium text-cb-blue">{state.ok}</p>}
    </form>
  );
}
