// Date-range filtering, shared by the filter UI and the photo query.
//
// Everything is expressed as a "YYYY-MM-DD" key in the *viewer's* local
// calendar, because "photos from the 12th" means the 12th where they are. The
// one trap: `new Date("2026-03-12")` is parsed as UTC per spec, while
// `new Date("2026-03-12T00:00:00")` is parsed as local. Mixing the two shifts
// the boundary by the UTC offset, so every conversion goes through the helpers
// below rather than being written out by hand.

const pad = (n: number) => String(n).padStart(2, "0");

/** Local calendar date as "YYYY-MM-DD". */
export const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Start of that local day. */
export const localStart = (key: string) => new Date(`${key}T00:00:00.000`);

/** End of that local day, inclusive. */
export const localEnd = (key: string) => new Date(`${key}T23:59:59.999`);

export const todayKey = () => toKey(new Date());

const shiftDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
};

export type DateRange = { from: string; to: string };
export type Preset = { id: string; label: string; range: () => DateRange };

// Ranges people actually ask for, so the common case is one click rather than
// two date pickers. Anything else goes through the custom inputs.
export const PRESETS: Preset[] = [
  { id: "today", label: "Today", range: () => ({ from: todayKey(), to: todayKey() }) },
  // Inclusive of today, so "last 7 days" spans 7 calendar days, not 8.
  { id: "7d", label: "Last 7 days", range: () => ({ from: toKey(shiftDays(-6)), to: todayKey() }) },
  { id: "30d", label: "Last 30 days", range: () => ({ from: toKey(shiftDays(-29)), to: todayKey() }) },
  {
    id: "12m",
    label: "Last 12 months",
    range: () => {
      const d = new Date();
      d.setFullYear(d.getFullYear() - 1);
      return { from: toKey(d), to: todayKey() };
    },
  },
];

export const matchingPreset = (from: string, to: string) =>
  PRESETS.find((p) => {
    const r = p.range();
    return r.from === from && r.to === to;
  });

/** "12 Mar 2026" in the viewer's locale. */
export const formatDate = (key: string) =>
  localStart(key).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

const pretty = formatDate;

/** Human label for the applied-filter chip: the preset name, else the dates. */
export function dateLabel(from: string, to: string): string {
  const preset = matchingPreset(from, to);
  if (preset) return preset.label;
  if (from && to) return from === to ? pretty(from) : `${pretty(from)} – ${pretty(to)}`;
  return from ? `After ${pretty(from)}` : `Before ${pretty(to)}`;
}
