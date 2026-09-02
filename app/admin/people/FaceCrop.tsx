"use client";

export type FaceBox = {
  imageId: string;
  imageWidth: number;
  imageHeight: number;
  boxX: number;
  boxY: number;
  boxWidth: number;
  boxHeight: number;
};

/** Thumbnail width we crop from. Wide enough that a small face is still legible. */
export const CROP_SOURCE_W = 1200;
/** Breathing room around the box — recognition works better with some context. */
export const CROP_PAD = 0.35;

/**
 * Padded crop rectangle in *source thumbnail* pixels, clamped to the image.
 * Shared by the CSS preview and the canvas that produces the enrolment blob, so
 * what an admin sees is exactly what gets enrolled.
 */
export function cropRect(face: FaceBox, sourceWidth: number, sourceHeight: number) {
  const scale = sourceWidth / face.imageWidth;
  const padX = face.boxWidth * CROP_PAD;
  const padY = face.boxHeight * CROP_PAD;
  const x = Math.max(0, (face.boxX - padX) * scale);
  const y = Math.max(0, (face.boxY - padY) * scale);
  const w = Math.min(sourceWidth - x, (face.boxWidth + padX * 2) * scale);
  const h = Math.min(sourceHeight - y, (face.boxHeight + padY * 2) * scale);
  return { x, y, w, h };
}

export const cropSrc = (imageId: string) =>
  `/api/images/${imageId}/thumb?w=${CROP_SOURCE_W}`;

/**
 * A face crop with no server-side image processing: the thumbnail is scaled and
 * offset inside a clipped box so only the face shows. Same maths as the
 * lightbox overlay, inverted — clip instead of outline.
 */
export default function FaceCrop({
  face,
  size = 64,
  highlight = true,
  className = "",
}: {
  face: FaceBox;
  size?: number;
  /** Spotlight the target face. Essential when a neighbour is in frame. */
  highlight?: boolean;
  className?: string;
}) {
  // Work in the image's own coordinate space; the browser scales the whole
  // thing to `size` via the width ratio below.
  const padX = face.boxWidth * CROP_PAD;
  const padY = face.boxHeight * CROP_PAD;
  const x = Math.max(0, face.boxX - padX);
  const y = Math.max(0, face.boxY - padY);
  const w = Math.min(face.imageWidth - x, face.boxWidth + padX * 2);
  const h = Math.min(face.imageHeight - y, face.boxHeight + padY * 2);
  const zoom = size / Math.max(w, 1);

  return (
    <span
      style={{ width: size, height: size * (h / Math.max(w, 1)) }}
      className={`relative block shrink-0 overflow-hidden rounded-[var(--r-media)] bg-cb-surface ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={cropSrc(face.imageId)}
        alt=""
        loading="lazy"
        decoding="async"
        style={{
          position: "absolute",
          width: face.imageWidth * zoom,
          height: face.imageHeight * zoom,
          left: -x * zoom,
          top: -y * zoom,
          maxWidth: "none",
        }}
      />
      {/* Padding often pulls a neighbouring face into frame, and two crops of
          the same photo then look identical. The huge outward shadow dims
          everything except this detection — it is clipped by the parent's
          overflow, so it costs one element and no extra paint area. */}
      {highlight && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            left: (face.boxX - x) * zoom,
            top: (face.boxY - y) * zoom,
            width: face.boxWidth * zoom,
            height: face.boxHeight * zoom,
            boxShadow: "0 0 0 9999px rgb(24 24 48 / 0.55)",
          }}
          className="rounded-[3px] border-2 border-cb-blue"
        />
      )}
    </span>
  );
}
