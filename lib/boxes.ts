// Face-box geometry, shared by enrolment (which face in this crop did the admin
// mean?) and archiving (is this detection one I already dismissed?).
//
// Detections are recreated from scratch on every reprocess, so archived regions
// can only be matched back by overlap, never by id.

export type Box = { boxX: number; boxY: number; boxWidth: number; boxHeight: number };
export type Rect = { x: number; y: number; width: number; height: number };

export const toRect = (b: Box): Rect => ({
  x: b.boxX,
  y: b.boxY,
  width: b.boxWidth,
  height: b.boxHeight,
});

/** Intersection over union. 1 is identical, 0 is disjoint. */
export function iou(a: Rect, b: Rect): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  const overlap = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  if (overlap === 0) return 0;
  const union = a.width * a.height + b.width * b.height - overlap;
  return union > 0 ? overlap / union : 0;
}

/**
 * The detector is deterministic for a given image, so a re-run reproduces almost
 * the same box — but "almost" is why this is an overlap test and not equality.
 * 0.5 is loose enough to survive a few pixels of drift and tight enough that a
 * neighbouring face never matches.
 */
export const ARCHIVE_IOU = 0.5;

export const isArchived = (face: Box, archived: Box[]) =>
  archived.some((a) => iou(toRect(face), toRect(a)) >= ARCHIVE_IOU);
