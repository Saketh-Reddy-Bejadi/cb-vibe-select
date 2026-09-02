/**
 * A person's name defaults to the `external_id` they were enrolled under, so
 * name == externalId is not by itself a problem — enrol as "Manjunath" and both
 * are "Manjunath", which is exactly right.
 *
 * What is worth flagging is an id that no one would want to see in search: a
 * uuid, a hash, a bare number. Those are the ones that need a human name.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX_BLOB = /^[0-9a-f]{16,}$/i;
const DIGITS = /^\d+$/;

export function looksOpaque(externalId: string): boolean {
  const id = externalId.trim();
  if (!id) return true;
  if (UUID.test(id) || HEX_BLOB.test(id) || DIGITS.test(id)) return true;
  // No letters at all, or long enough that it is plainly an identifier.
  if (!/\p{L}/u.test(id)) return true;
  return id.length > 40;
}

/** Only true when the auto-derived name is one a person would not want to read. */
export const needsHumanName = (name: string, externalId: string) =>
  name === externalId && looksOpaque(externalId);
