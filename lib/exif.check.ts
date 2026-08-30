// Runnable self-check: node --experimental-strip-types lib/exif.check.ts
// Guards the branch most likely to regress — corrupt/non-image bytes must yield nulls, never throw.
import assert from "node:assert";
import { parseExif } from "./exif.ts";

const empty = await parseExif(Buffer.from("not an image at all"));
assert.deepStrictEqual(empty, { capturedAt: null, latitude: null, longitude: null });

const truncatedJpeg = await parseExif(Buffer.from([0xff, 0xd8, 0xff, 0xe1, 0x00]));
assert.deepStrictEqual(truncatedJpeg, { capturedAt: null, latitude: null, longitude: null });

console.log("exif.check: ok");
