"use client";

import { useActionState } from "react";
import { Archive, Undo2 } from "lucide-react";
import { Spinner } from "@/components/spinner";
import { archiveFace, restoreFace, type PeopleState } from "./actions";
import EnrollForm from "./EnrollForm";
import FaceCrop, { type FaceBox } from "./FaceCrop";

const initial: PeopleState = {};

/** An unidentified face: name it to enrol, or archive it to stop seeing it. */
export function UnknownFaceCard({
  faceId,
  fileName,
  face,
}: {
  faceId: string;
  fileName: string;
  face: FaceBox;
}) {
  const [state, action, pending] = useActionState(archiveFace, initial);

  return (
    <li className="card flex items-start gap-3 p-3">
      <FaceCrop face={face} size={72} />
      <div className="min-w-0 flex-1">
        <p className="t-small mb-2 truncate text-cb-text-muted" title={fileName}>
          {fileName}
        </p>
        <EnrollForm face={face} />
        <form action={action} className="mt-2">
          <input type="hidden" name="faceId" value={faceId} />
          <button className="btn btn-sm btn-tertiary -ml-3" disabled={pending}>
            {pending ? <Spinner className="h-3.5 w-3.5" /> : <Archive className="h-4 w-4" aria-hidden />}
            Not a face / not wanted
          </button>
        </form>
        <div aria-live="polite" className="empty:hidden">
          {state.error && (
            <p role="alert" className="note note-error">
              {state.error}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

/** An archived region, with the one-click undo that makes archiving safe. */
export function ArchivedFaceCard({
  archivedId,
  fileName,
  face,
}: {
  archivedId: string;
  fileName: string;
  face: FaceBox;
}) {
  const [state, action, pending] = useActionState(restoreFace, initial);

  return (
    <li className="card flex items-center gap-3 p-3">
      <FaceCrop face={face} size={48} />
      <p className="t-small min-w-0 flex-1 truncate text-cb-text-muted" title={fileName}>
        {fileName}
      </p>
      <form action={action} className="shrink-0">
        <input type="hidden" name="archivedId" value={archivedId} />
        <button className="btn btn-sm btn-neutral" disabled={pending}>
          {pending ? <Spinner className="h-3.5 w-3.5" /> : <Undo2 className="h-4 w-4" aria-hidden />}
          Restore
        </button>
      </form>
      <div aria-live="polite" className="sr-only">
        {state.error ?? state.ok ?? ""}
      </div>
    </li>
  );
}
