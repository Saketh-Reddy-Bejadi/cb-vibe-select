// Runnable self-check: node --experimental-strip-types lib/boxes.check.ts
// Archiving survives reprocessing only because a re-detected face still matches
// the stored region by overlap. Both failure modes are silent: too strict and
// archives quietly come back, too loose and a neighbour vanishes with them.
import assert from "node:assert";
import { ARCHIVE_IOU, isArchived, iou, toRect } from "./boxes.ts";

const face = { boxX: 1500, boxY: 900, boxWidth: 520, boxHeight: 640 };

// Identical boxes — a deterministic re-run of the detector.
assert.equal(iou(toRect(face), toRect(face)), 1);
assert.ok(isArchived(face, [face]), "an exact repeat must stay archived");

// A few pixels of drift must not resurrect an archived face.
for (const d of [1, 4, 12]) {
  const drifted = { ...face, boxX: face.boxX + d, boxY: face.boxY - d };
  assert.ok(isArchived(drifted, [face]), `${d}px of drift should still match`);
}

// The adjacent face from a group shot must NOT be swept up.
const neighbour = { boxX: 1990, boxY: 1010, boxWidth: 470, boxHeight: 600 };
assert.ok(iou(toRect(face), toRect(neighbour)) < ARCHIVE_IOU);
assert.equal(isArchived(neighbour, [face]), false, "a neighbour must not be archived too");

// Nothing archived means nothing filtered.
assert.equal(isArchived(face, []), false);

// Disjoint boxes score zero rather than throwing.
assert.equal(iou(toRect(face), toRect({ boxX: 0, boxY: 0, boxWidth: 10, boxHeight: 10 })), 0);

// A genuinely different framing of the same region still matches; a box at half
// the size does not, which is the boundary the threshold is chosen for.
const looser = { boxX: 1480, boxY: 880, boxWidth: 560, boxHeight: 680 };
assert.ok(isArchived(looser, [face]), "modest re-framing should still match");
const halfSize = { boxX: 1500, boxY: 900, boxWidth: 260, boxHeight: 320 };
assert.equal(isArchived(halfSize, [face]), false, "a much smaller box is a different face");

console.log("boxes.check: ok");
