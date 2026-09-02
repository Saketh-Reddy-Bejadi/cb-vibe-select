"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, CalendarRange, Check, FolderClosed, Search, User, X } from "lucide-react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { PRESETS, dateLabel, formatDate, matchingPreset, todayKey } from "@/lib/dates";

type Person = { id: string; name: string };
type Folder = { id: string; name: string };
type Selected = { people: string[]; folder: string; from: string; to: string };

export default function FilterBar({
  persons,
  folders,
  selected,
}: {
  persons: Person[];
  folders: Folder[];
  selected: Selected;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  // Every selection is a server round trip. The transition gives us a pending
  // flag for it, so the wait is visible instead of the palette just sitting
  // there looking broken.
  const [pending, startTransition] = useTransition();
  // A half-entered range: one end set, the other still blank. Held here rather
  // than pushed, so an open-ended "everything after 12 Mar" query never runs.
  const [draft, setDraft] = useState<{ from: string; to: string } | null>(null);

  function apply(next: Partial<Selected>) {
    // Any real navigation supersedes whatever was half-typed.
    setDraft(null);
    const s = { ...selected, ...next };
    const p = new URLSearchParams();
    if (s.people.length) p.set("people", s.people.join(","));
    if (s.folder) p.set("folder", s.folder);
    if (s.from) p.set("from", s.from);
    if (s.to) p.set("to", s.to);
    const qs = p.toString();
    // scroll:false — toggling a filter shouldn't yank you back to the top.
    startTransition(() => router.push(qs ? `/?${qs}` : "/", { scroll: false }));
  }

  const togglePerson = (id: string) =>
    apply({
      people: selected.people.includes(id)
        ? selected.people.filter((x) => x !== id)
        : [...selected.people, id],
    });

  // Folder is single-select: picking the active one clears it.
  const toggleFolder = (id: string) => apply({ folder: selected.folder === id ? "" : id });

  const clearAll = () => apply({ people: [], folder: "", from: "", to: "" });

  const setRange = (from: string, to: string) => apply({ from, to });

  // What the inputs show: the half-entered range while one is in progress,
  // otherwise what is actually applied.
  const range = draft ?? { from: selected.from, to: selected.to };

  /**
   * Edit one end of the range. A complete range applies straight away —
   * auto-apply on end-date selection is the documented pattern, so no Apply
   * button. A half-entered one stays a draft: querying "everything after
   * 12 Mar" while the user is still reaching for the second field is work
   * nobody asked for, and it makes the page flash mid-edit.
   */
  function editDate(field: "from" | "to", value: string) {
    const next = { ...range, [field]: value };
    if (next.from && next.to) setRange(next.from, next.to);
    else setDraft(next);
  }

  /** A one-sided range left as-is is still a real filter — apply it on exit. */
  function flushDraft() {
    if (!draft) return;
    if (draft.from !== selected.from || draft.to !== selected.to) {
      setRange(draft.from, draft.to);
    } else {
      setDraft(null);
    }
  }

  const personName = (id: string) => persons.find((p) => p.id === id)?.name ?? id;
  const folderName = (id: string) => folders.find((f) => f.id === id)?.name ?? id;

  const hasDates = !!(selected.from || selected.to);
  // A saved range that matches no preset must have come from the custom inputs,
  // so reopen them showing it rather than hiding how the filter was set.
  const isCustomRange = hasDates && !matchingPreset(selected.from, selected.to);
  const showCustom = customOpen || isCustomRange;
  const maxDate = todayKey();

  const activeCount = selected.people.length + (selected.folder ? 1 : 0) + (hasDates ? 1 : 0);

  // ⌘K / Ctrl-K anywhere, and "/" when not already typing in a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing =
        e.target instanceof HTMLElement &&
        (e.target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName));
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <section aria-label="Filters" aria-busy={pending} className="flex flex-col gap-3">
      {/* One entry point for every filter, identical on phone and desktop —
          the palette dialog is full-width on small screens by itself. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex h-14 w-full items-center gap-3 rounded-[var(--r-card)] border border-cb-border bg-white px-4 text-left transition-colors duration-150 ease-out hover:border-cb-border-hover"
      >
        <Search
          className="h-5 w-5 shrink-0 text-cb-text-subtle transition-colors duration-150 ease-out group-hover:text-cb-blue"
          aria-hidden
        />
        <span className="flex-1 truncate text-[0.9375rem] font-medium text-cb-text-subtle">
          Search people, folders or dates…
        </span>
        {activeCount > 0 && (
          <span className="count shrink-0">{activeCount}</span>
        )}
        <kbd className="hidden shrink-0 items-center gap-0.5 rounded-md border border-cb-border bg-cb-grey-100 px-1.5 py-0.5 font-sans text-[11px] font-bold text-cb-text-muted sm:flex">
          <span className="text-[13px] leading-none">⌘</span>K
        </kbd>
      </button>

      {/* Also shown with the palette closed — removing a chip is a round trip too. */}
      {pending && <div className="loading-bar -mt-1.5" role="status" aria-label="Updating results" />}

      {/* Applied filters, removable. This is the only place state is shown, so
          there is nothing to keep in sync between two layouts. */}
      {activeCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {selected.folder && (
            <Chip icon={<FolderClosed className="h-3.5 w-3.5" />} onRemove={() => apply({ folder: "" })}>
              {folderName(selected.folder)}
            </Chip>
          )}
          {selected.people.map((id) => (
            <Chip key={id} icon={<User className="h-3.5 w-3.5" />} onRemove={() => togglePerson(id)}>
              {personName(id)}
            </Chip>
          ))}
          {hasDates && (
            <Chip
              icon={<CalendarDays className="h-3.5 w-3.5" />}
              onRemove={() => setRange("", "")}
            >
              {dateLabel(selected.from, selected.to)}
            </Chip>
          )}
          <button type="button" onClick={clearAll} className="btn btn-sm btn-tertiary">
            Clear all
          </button>
        </div>
      )}

      <CommandDialog
        open={open}
        onOpenChange={(o) => {
          // Closing applies a range that only ever got one end filled in.
          if (!o) flushDraft();
          setOpen(o);
        }}
        title="Filter photos"
        description="Search people, folders and dates to narrow the gallery."
        // CommandDialog pins itself at top-1/3. Left at that, a full list plus
        // the date footer ran past the bottom of the viewport, so the top is
        // raised and the whole dialog capped — the list scrolls inside it.
        className="top-[7dvh] flex max-h-[86dvh] flex-col sm:max-w-lg"
      >
        <Command
          // Keep the list open while toggling several people in a row.
          shouldFilter
          className="min-h-0 flex-1 [&_[data-slot=command-input-wrapper]]:p-2"
        >
          <CommandInput placeholder="Search people, folders or dates…" />
          <div className="px-2 pb-1" aria-hidden>
            {pending ? <div className="loading-bar" /> : <div className="h-[2px]" />}
          </div>
          <CommandList className="max-h-none min-h-0 flex-1">
            <CommandEmpty>No matches.</CommandEmpty>

            {persons.length > 0 && (
              <CommandGroup heading="People">
                {persons.map((p) => (
                  <Row
                    key={p.id}
                    value={`person ${p.name}`}
                    selected={selected.people.includes(p.id)}
                    onSelect={() => togglePerson(p.id)}
                    icon={<User className="h-4 w-4" />}
                  >
                    {p.name}
                  </Row>
                ))}
              </CommandGroup>
            )}

            {persons.length > 0 && folders.length > 0 && <CommandSeparator />}

            {folders.length > 0 && (
              <CommandGroup heading="Folders">
                {folders.map((f) => (
                  <Row
                    key={f.id}
                    value={`folder ${f.name}`}
                    selected={selected.folder === f.id}
                    onSelect={() => toggleFolder(f.id)}
                    icon={<FolderClosed className="h-4 w-4" />}
                  >
                    {f.name}
                  </Row>
                ))}
              </CommandGroup>
            )}

            {folders.length > 0 && <CommandSeparator />}

            <CommandGroup heading="Date taken">
              {PRESETS.map((p) => {
                const r = p.range();
                const on = selected.from === r.from && selected.to === r.to;
                return (
                  <Row
                    key={p.id}
                    value={`date ${p.label}`}
                    selected={on}
                    // Selecting the active preset clears it, matching folders.
                    onSelect={() => (on ? setRange("", "") : setRange(r.from, r.to))}
                    icon={<CalendarDays className="h-4 w-4" />}
                  >
                    {p.label}
                  </Row>
                );
              })}
              <Row
                value="date custom range between"
                selected={isCustomRange}
                onSelect={() => {
                  // Collapsing the inputs is an exit too — don't strand a draft.
                  if (customOpen) flushDraft();
                  setCustomOpen((v) => !v);
                }}
                icon={<CalendarRange className="h-4 w-4" />}
              >
                Custom range…
              </Row>
            </CommandGroup>
          </CommandList>

          {/* Below the list, so the palette's own search can't filter it away
              mid-edit. Native date inputs on purpose: OS pickers, locale
              formatting, keyboard entry and mobile date wheels for free. */}
          {showCustom && (
            <div className="border-t border-cb-border p-3">
              <div className="flex items-end gap-3">
              {/* Keyed on their own committed value: a preset or a cleared chip
                  remounts them with the new date, while typing leaves the key
                  alone so nothing resets underneath the cursor. */}
              <DateField
                key={`from-${selected.from}`}
                label="From"
                value={range.from}
                max={range.to || maxDate}
                onCommit={(v) => editDate("from", v)}
              />
              <DateField
                key={`to-${selected.to}`}
                label="To"
                value={range.to}
                min={range.from || undefined}
                max={maxDate}
                onCommit={(v) => editDate("to", v)}
              />
                {(range.from || range.to) && (
                  <button
                    type="button"
                    onClick={() => {
                      setRange("", "");
                      setCustomOpen(false);
                    }}
                    className="btn btn-sm btn-tertiary shrink-0"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* The selection phase has to be legible, or a half-entered range
                  just looks like the filter is ignoring you. Announced too, so
                  it reaches someone not watching the inputs. */}
              <p
                aria-live="polite"
                className="t-small mt-2 min-h-5 text-cb-text-muted empty:mt-0"
              >
                {draft?.from && !draft.to
                  ? `From ${formatDate(draft.from)} — pick an end date, or close to apply.`
                  : draft?.to && !draft.from
                    ? `Up to ${formatDate(draft.to)} — pick a start date, or close to apply.`
                    : ""}
              </p>
            </div>
          )}
        </Command>
      </CommandDialog>
    </section>
  );
}

/**
 * A native date input that only navigates once the date is actually complete.
 *
 * Uncontrolled on purpose. While a date is half-typed the browser reports
 * `value === ""`; feeding that back through React as a controlled value wipes
 * the segments the user has already entered. Here React never writes to the
 * element after mount — the parent's `key` handles resets instead.
 *
 * `validity.valid` gates the commit, which also covers the year field: typing
 * "2026" passes through 0002 and 0020, each a syntactically complete date. The
 * 1900 floor makes those range-underflow, so they never trigger a navigation.
 */
const MIN_DATE = "1900-01-01";

function DateField({
  label,
  value,
  min = MIN_DATE,
  max,
  onCommit,
}: {
  label: string;
  value: string;
  min?: string;
  max?: string;
  onCommit: (value: string) => void;
}) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="t-label text-cb-text-muted">{label}</span>
      <input
        type="date"
        defaultValue={value}
        min={min}
        max={max}
        onChange={(e) => {
          const next = e.target.value;
          // Empty means "still being typed" — committing would navigate and
          // take the half-entered date with it.
          if (next && next !== value && e.target.validity.valid) onCommit(next);
        }}
        onBlur={(e) => {
          // Emptied and left: that is a real clear, not an incomplete entry.
          if (!e.target.value && value) onCommit("");
        }}
        className="field !h-10 w-full"
      />
    </label>
  );
}

function Row({
  value,
  selected,
  onSelect,
  icon,
  children,
}: {
  value: string;
  selected: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <CommandItem value={value} onSelect={onSelect} className="min-h-11 gap-3">
      <span className={`shrink-0 ${selected ? "text-cb-blue" : "text-cb-text-subtle"}`} aria-hidden>
        {icon}
      </span>
      <span className="flex-1 truncate">{children}</span>
      {/* aria-selected is set by cmdk for the *highlighted* row, so applied
          state needs its own affordance rather than colour alone. */}
      {selected && (
        <>
          <Check className="h-4 w-4 shrink-0 text-cb-blue" aria-hidden />
          <span className="sr-only">(applied)</span>
        </>
      )}
    </CommandItem>
  );
}

function Chip({
  icon,
  onRemove,
  children,
}: {
  icon: React.ReactNode;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onRemove} className="chip chip-blue chip-removable">
      <span aria-hidden className="shrink-0 opacity-70">
        {icon}
      </span>
      {children}
      <X className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="sr-only">Remove filter</span>
    </button>
  );
}
