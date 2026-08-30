import exifr from "exifr";

export type ExifData = {
  capturedAt: Date | null;
  latitude: number | null;
  longitude: number | null;
};

const EMPTY: ExifData = { capturedAt: null, latitude: null, longitude: null };

// Extract capture date + GPS from image bytes. exifr returns GPS already in decimal degrees
// and dates as Date objects. Reverse-geocoding to a place name is deferred (needs a geocoder;
// see picscope scope) — we store lat/long now, locationName stays null.
export async function parseExif(
  input: Buffer | Uint8Array | ArrayBuffer,
): Promise<ExifData> {
  try {
    const out = await exifr.parse(input, { tiff: true, exif: true, gps: true });
    if (!out) return EMPTY;

    const raw = out.DateTimeOriginal ?? out.CreateDate ?? out.ModifyDate ?? null;
    const capturedAt = raw instanceof Date && !Number.isNaN(raw.getTime()) ? raw : null;

    const latitude =
      typeof out.latitude === "number" && Number.isFinite(out.latitude) ? out.latitude : null;
    const longitude =
      typeof out.longitude === "number" && Number.isFinite(out.longitude) ? out.longitude : null;

    return { capturedAt, latitude, longitude };
  } catch {
    // Corrupt/unsupported metadata must never break ingestion.
    return EMPTY;
  }
}
