"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import { Spinner } from "@/components/spinner";
import { removeEnrolledFace, type PeopleState } from "./actions";
import type { EnrolledFace } from "@/lib/faces";

const initial: PeopleState = {};

export default function EnrolledFaceRow({ face }: { face: EnrolledFace }) {
  const [state, action, pending] = useActionState(removeEnrolledFace, initial);

  return (
    <li className="card flex items-center justify-between gap-3 p-3">
      <div className="min-w-0">
        <p className="t-small truncate font-semibold text-cb-text">
          {face.external_id ?? "(no identity)"}
        </p>
        <p className="t-small truncate text-cb-text-subtle">
          {face.face_id}
          {face.confidence != null && ` · ${(face.confidence * 100).toFixed(0)}% detection`}
        </p>
        <div aria-live="polite" className="empty:hidden">
          {state.error && (
            <p role="alert" className="note note-error">
              {state.error}
            </p>
          )}
          {state.ok && <p className="note note-ok">{state.ok}</p>}
        </div>
      </div>
      <form action={action} className="shrink-0">
        <input type="hidden" name="faceId" value={face.face_id} />
        <button className="btn btn-sm btn-neutral text-cb-danger" disabled={pending}>
          {pending ? <Spinner className="h-3.5 w-3.5" /> : <Trash2 className="h-4 w-4" aria-hidden />}
          Delete
        </button>
      </form>
    </li>
  );
}
