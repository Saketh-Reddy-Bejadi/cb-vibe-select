"use client";

import { useActionState, useState } from "react";
import { Check, Eye, EyeOff, Pencil, Trash2, X } from "lucide-react";
import { Spinner } from "@/components/spinner";
import { Button } from "@/components/ui/button";
import { renamePerson, removeIdentity, togglePersonHidden, type PeopleState } from "./actions";
import FaceCrop, { type FaceBox } from "./FaceCrop";

const initial: PeopleState = {};

export type PersonSummary = {
  id: string;
  externalId: string;
  name: string;
  hidden: boolean;
  needsName: boolean;
  photoCount: number;
  sample: FaceBox | null;
};

export default function PersonRow({ person }: { person: PersonSummary }) {
  const [editing, setEditing] = useState(false);
  const [rename, renameAction, renaming] = useActionState(renamePerson, initial);
  const [removal, removeAction, removing] = useActionState(removeIdentity, initial);
  // Computed on the server: a name matching its external_id is normal, and only
  // worth flagging when that id is something like a uuid.

  return (
    <li className={`card p-3 sm:p-4 ${person.hidden ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-3">
        {person.sample ? (
          <FaceCrop face={person.sample} size={56} />
        ) : (
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[var(--r-media)] bg-cb-surface text-xs font-bold text-cb-text-subtle">
            ?
          </span>
        )}

        <div className="min-w-0 flex-1">
          {editing ? (
            <form
              action={(fd) => {
                fd.set("personId", person.id);
                renameAction(fd);
                setEditing(false);
              }}
              className="flex items-center gap-2"
            >
              <input
                name="name"
                defaultValue={person.name}
                required
                maxLength={120}
                autoFocus
                aria-label="Name"
                className="field !h-9 min-w-0 flex-1 !text-sm"
              />
              <button className="btn btn-sm btn-primary shrink-0" disabled={renaming}>
                {renaming ? <Spinner className="h-3.5 w-3.5" /> : <Check className="h-4 w-4" aria-hidden />}
                Save
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="btn btn-sm btn-neutral shrink-0"
              >
                <X className="h-4 w-4" aria-hidden />
                <span className="sr-only">Cancel</span>
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2">
              <p className="t-body min-w-0 truncate font-semibold text-cb-text">{person.name}</p>
              {person.needsName && (
                <span
                  className="chip chip-neutral shrink-0 !min-h-5 !px-2 !text-[11px]"
                  title="Named after an opaque recognition id — rename to make search readable"
                >
                  raw id
                </span>
              )}
              {person.hidden && (
                <span className="chip chip-neutral shrink-0 !min-h-5 !px-2 !text-[11px]">
                  hidden
                </span>
              )}
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setEditing(true)}
                aria-label={`Rename ${person.name}`}
                className="shrink-0"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          <p className="t-small mt-0.5 truncate text-cb-text-muted">
            {person.photoCount} photo{person.photoCount === 1 ? "" : "s"}
            {person.name !== person.externalId && ` · ${person.externalId}`}
          </p>

          <div aria-live="polite" className="empty:hidden mt-1">
            {rename.error && (
              <p role="alert" className="note note-error">
                {rename.error}
              </p>
            )}
            {removal.error && (
              <p role="alert" className="note note-error">
                {removal.error}
              </p>
            )}
            {removal.ok && <p className="note note-ok">{removal.ok}</p>}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 border-t border-cb-border pt-3">
        {/* Display-only: the Space still recognises them, PicScope stops showing them. */}
        <form action={togglePersonHidden}>
          <input type="hidden" name="personId" value={person.id} />
          <button className="btn btn-sm btn-neutral" aria-pressed={person.hidden}>
            {person.hidden ? <Eye className="h-4 w-4" aria-hidden /> : <EyeOff className="h-4 w-4" aria-hidden />}
            {person.hidden ? "Show in search" : "Hide from search"}
          </button>
        </form>

        {/* Recognition: drops every reference so future scans stop matching them. */}
        <form
          action={(fd) => {
            fd.set("externalId", person.externalId);
            removeAction(fd);
          }}
        >
          <button
            className="btn btn-sm btn-neutral text-cb-danger"
            disabled={removing}
            title="Deletes this identity's enrolled reference faces from the recognition collection"
          >
            {removing ? <Spinner className="h-3.5 w-3.5" /> : <Trash2 className="h-4 w-4" aria-hidden />}
            Stop recognising
          </button>
        </form>
      </div>
    </li>
  );
}
