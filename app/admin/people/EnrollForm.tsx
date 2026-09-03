"use client";

import { useActionState, useId, useState, useTransition } from "react";
import { UserPlus } from "lucide-react";
import { Spinner } from "@/components/spinner";
import { enrollPerson, type PeopleState } from "./actions";
import FaceCrop, { CROP_SOURCE_W, cropRect, cropSrc, type FaceBox } from "./FaceCrop";

const initial: PeopleState = {};

/**
 * Names an unidentified face and enrols it as a reference.
 *
 * The crop is produced here rather than on the server: the browser already has
 * the thumbnail on screen, so a canvas turns the same rectangle into a JPEG with
 * no image library, no new dependency and nothing stored. The thumbnail is
 * same-origin, so the canvas is never tainted.
 */
export default function EnrollForm({ face }: { face: FaceBox }) {
  const [state, formAction, pending] = useActionState(enrollPerson, initial);
  const [, startTransition] = useTransition();
  const [preparing, setPreparing] = useState(false);
  const id = useId();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = (new FormData(e.currentTarget).get("name") as string)?.trim();
    if (!name) return;

    // The crop is awaited *before* the transition. An `await` inside
    // startTransition suspends and loses the scope, so formAction would still
    // be called outside it — the transition callback has to stay synchronous.
    setPreparing(true);
    let crop: Crop | null = null;
    try {
      crop = await cropToBlob(face);
    } finally {
      setPreparing(false);
    }
    if (!crop) return;

    const data = new FormData();
    data.set("name", name);
    data.set("image", new File([crop.blob], "face.jpg", { type: "image/jpeg" }));
    // Where the intended face sits inside the crop, in the submitted image's
    // own pixels. The Space indexes every face it finds, so the server needs
    // this to tell the target apart from a neighbour caught by the padding.
    data.set("targetX", String(Math.round(crop.target.x)));
    data.set("targetY", String(Math.round(crop.target.y)));
    data.set("targetW", String(Math.round(crop.target.w)));
    data.set("targetH", String(Math.round(crop.target.h)));

    startTransition(() => formAction(data));
  }

  const working = preparing || pending;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <label htmlFor={id} className="sr-only">
          Name for this face
        </label>
        <input
          id={id}
          name="name"
          required
          maxLength={120}
          placeholder="Who is this?"
          autoComplete="off"
          className="field !h-10 min-w-0 flex-1 !text-sm"
        />
        <button disabled={working} className="btn btn-sm btn-primary shrink-0">
          {working ? <Spinner className="h-3.5 w-3.5" /> : <UserPlus className="h-4 w-4" aria-hidden />}
          {working ? "Enrolling…" : "Enroll"}
        </button>
      </div>
      <div aria-live="polite" className="empty:hidden">
        {state.error && (
          <p role="alert" className="note note-error">
            {state.error}
          </p>
        )}
        {state.ok && <p className="note note-ok">{state.ok}</p>}
      </div>
    </form>
  );
}

type Crop = { blob: Blob; target: { x: number; y: number; w: number; h: number } };

/**
 * Draw the padded face rectangle to a canvas and hand back JPEG bytes, along
 * with where the intended face landed inside that canvas.
 */
async function cropToBlob(face: FaceBox): Promise<Crop | null> {
  const img = new Image();
  img.src = cropSrc(face.imageId);
  try {
    await img.decode();
  } catch {
    return null;
  }

  // Measure against what actually loaded — the proxy may have returned a
  // different size than requested, and guessing would crop the wrong region.
  const sw = img.naturalWidth || CROP_SOURCE_W;
  const sh = img.naturalHeight;
  const { x, y, w, h } = cropRect(face, sw, sh);
  if (w < 1 || h < 1) return null;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w);
  canvas.height = Math.round(h);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(img, x, y, w, h, 0, 0, canvas.width, canvas.height);

  // The crop is drawn 1:1, so source pixels map straight onto canvas pixels.
  const scale = sw / face.imageWidth;
  const target = {
    x: face.boxX * scale - x,
    y: face.boxY * scale - y,
    w: face.boxWidth * scale,
    h: face.boxHeight * scale,
  };

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92)
  );
  return blob ? { blob, target } : null;
}

export { FaceCrop };
