"use client";

import { useActionState, useId } from "react";
import { ArrowRight } from "lucide-react";
import { addFolder, type FolderFormState } from "./actions";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/spinner";

const initial: FolderFormState = {};

export default function FolderForm() {
  const [state, formAction, pending] = useActionState(addFolder, initial);
  const id = useId();

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-url`} className="t-label text-cb-text-muted">
          SharePoint / OneDrive folder link
        </label>
        <input
          id={`${id}-url`}
          name="url"
          type="url"
          required
          aria-describedby={state.error ? `${id}-err` : undefined}
          aria-invalid={state.error ? true : undefined}
          placeholder="https://contoso.sharepoint.com/sites/Marketing/Shared%20Documents/Offsite"
          className="field h-12 truncate"
        />
      </div>

      {/* leading-normal overrides Label's own `leading-none`, which otherwise
          collapses the text box to 14px against an 18px checkbox. The 1.5px
          nudge centres the box on the first line, so it stays put when the
          label wraps. */}
      <Label
        htmlFor={`${id}-public`}
        className="t-small flex cursor-pointer items-start gap-2.5 font-medium leading-normal text-cb-text"
      >
        {/* value="on" matches the native default the server action tests for. */}
        <Checkbox
          id={`${id}-public`}
          name="isPublicOverride"
          value="on"
          className="mt-[1.5px] size-[18px] shrink-0"
        />
        Publicly discoverable company-wide (per-folder override)
      </Label>

      <button disabled={pending} className="btn btn-lg btn-primary self-start">
        {pending && <Spinner />}
        {pending ? "Resolving…" : "Resolve & add folder"}
        {!pending && <ArrowRight data-arrow className="h-4 w-4" aria-hidden />}
      </button>

      {/* Outcome is announced, and errors carry role=alert for immediacy. */}
      <div aria-live="polite" className="empty:hidden">
        {state.error && (
          <p id={`${id}-err`} role="alert" className="note note-error">
            {state.error}
          </p>
        )}
        {state.ok && <p className="note note-ok">{state.ok}</p>}
      </div>
    </form>
  );
}
