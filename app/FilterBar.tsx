"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { CalendarDays, ChevronsUpDown, SlidersHorizontal, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Date range is parked until the picker gets another pass. Flip to true to bring
// it back — the `from`/`to` search params, server query and `DateRangePicker`
// below are all still wired up, only the control is hidden.
const SHOW_DATE_FILTER = false;

type Person = { id: string; name: string };
type Folder = { id: string; name: string };
type Selected = { people: string[]; folder: string; from: string; to: string };

// Local-date <-> "YYYY-MM-DD". Deliberately not `toISOString()`, which shifts
// the day backwards for anyone east of UTC.
const toKey = (d?: Date) =>
  d
    ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`
    : "";

function fromKey(s: string): Date | undefined {
  if (!s) return undefined;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

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
  const [sheetOpen, setSheetOpen] = useState(false);

  function apply(next: Partial<Selected>) {
    const s = { ...selected, ...next };
    const p = new URLSearchParams();
    if (s.people.length) p.set("people", s.people.join(","));
    if (s.folder) p.set("folder", s.folder);
    if (s.from) p.set("from", s.from);
    if (s.to) p.set("to", s.to);
    const qs = p.toString();
    router.push(qs ? `/?${qs}` : "/");
  }

  function togglePerson(id: string) {
    apply({
      people: selected.people.includes(id)
        ? selected.people.filter((x) => x !== id)
        : [...selected.people, id],
    });
  }

  const clearAll = () => apply({ people: [], folder: "", from: "", to: "" });
  const nameById = (id: string) => persons.find((p) => p.id === id)?.name ?? id;
  // Only count filters the user can actually see and clear.
  const activeCount =
    selected.people.length +
    (selected.folder ? 1 : 0) +
    (SHOW_DATE_FILTER && (selected.from || selected.to) ? 1 : 0);

  const shared = { persons, folders, selected, apply, togglePerson };

  return (
    <section aria-label="Filters">
      {/* ---- Mobile: a compact bar that opens a bottom sheet ---- */}
      <div className="flex items-center gap-2 sm:hidden">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger className="btn btn-neutral flex-1">
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
            Filters
            {/* Badge's default variant is already --primary (= cb.blue). */}
            {activeCount > 0 && <Badge className="ml-1 min-w-5">{activeCount}</Badge>}
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="max-h-[88dvh] rounded-t-[var(--r-sheet)] p-0"
          >
            <SheetHeader className="px-4 pb-3 pt-4">
              <SheetTitle className="t-h4 text-cb-text">Filters</SheetTitle>
            </SheetHeader>
            <Separator />
            <ScrollArea className="max-h-[58dvh] flex-1">
              <div className="flex flex-col gap-5 p-4">
                <FilterControls {...shared} stacked />
              </div>
            </ScrollArea>
            <Separator />
            {/* Sticky action bar so the primary action is always reachable. */}
            <div className="flex gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {activeCount > 0 && (
                <button type="button" onClick={clearAll} className="btn btn-neutral flex-1">
                  Clear all
                </button>
              )}
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="btn btn-primary flex-1"
              >
                Done
              </button>
            </div>
          </SheetContent>
        </Sheet>

        {activeCount > 0 && (
          <button
            type="button"
            onClick={clearAll}
            aria-label="Clear all filters"
            className="btn btn-neutral !px-0 aspect-square"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>

      {/* ---- Desktop: everything inline ---- */}
      <div className="card hidden p-4 sm:block sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="t-label text-cb-text-muted">Filters</h2>
          {activeCount > 0 && (
            <button type="button" onClick={clearAll} className="btn btn-sm btn-tertiary -mr-1">
              <X className="h-4 w-4" aria-hidden />
              Clear all
            </button>
          )}
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <FilterControls {...shared} />
        </div>
      </div>

      {/* Selected people as removable chips — shown on every size. */}
      {selected.people.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2 sm:mt-0 sm:border-t-0">
          {selected.people.map((id) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => togglePerson(id)}
                className="chip chip-blue chip-removable"
              >
                {nameById(id)}
                <X className="h-3.5 w-3.5" aria-hidden />
                <span className="sr-only">Remove filter</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */

type ControlProps = {
  persons: Person[];
  folders: Folder[];
  selected: Selected;
  apply: (next: Partial<Selected>) => void;
  togglePerson: (id: string) => void;
  /** Sheet layout: labelled, full-width, expanded rather than popover-bound. */
  stacked?: boolean;
};

function FilterControls({
  persons,
  folders,
  selected,
  apply,
  togglePerson,
  stacked = false,
}: ControlProps) {
  return (
    <>
      <Group label="People" stacked={stacked}>
        {stacked ? (
          <PeopleList persons={persons} selected={selected} togglePerson={togglePerson} />
        ) : (
          <PeoplePopover persons={persons} selected={selected} togglePerson={togglePerson} />
        )}
      </Group>

      <Group label="Folder" stacked={stacked}>
        <Select
          value={selected.folder || "all"}
          onValueChange={(v) => apply({ folder: !v || v === "all" ? "" : String(v) })}
        >
          <SelectTrigger aria-label="Source folder" className="field !h-11 w-full !py-0 !pl-3.5 !pr-3">
            <SelectValue placeholder="All folders" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All folders</SelectItem>
            {folders.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Group>

      {SHOW_DATE_FILTER && (
        <Group label="Date taken" stacked={stacked}>
          <DateRangePicker selected={selected} apply={apply} inline={stacked} />
        </Group>
      )}
    </>
  );
}

function Group({
  label,
  stacked,
  children,
}: {
  label: string;
  stacked: boolean;
  children: React.ReactNode;
}) {
  // Inline, the control labels itself; stacked, it gets a visible field label.
  if (!stacked) return <div className="min-w-0">{children}</div>;
  return (
    <div className="flex flex-col gap-2">
      <Label className="t-label text-cb-text-muted">{label}</Label>
      {children}
    </div>
  );
}

function PeoplePopover({
  persons,
  selected,
  togglePerson,
}: Pick<ControlProps, "persons" | "selected" | "togglePerson">) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="field justify-between">
        <span className="flex items-center gap-2 truncate">
          People
          {selected.people.length > 0 && <span className="count">{selected.people.length}</span>}
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-cb-text-subtle" aria-hidden />
      </PopoverTrigger>
      <PopoverContent className="w-[min(20rem,calc(100vw-2rem))] p-0" align="start" sideOffset={6}>
        <Command>
          <CommandInput placeholder="Search people…" />
          <CommandList>
            <CommandEmpty>No people found.</CommandEmpty>
            <CommandGroup>
              {persons.map((p) => {
                const on = selected.people.includes(p.id);
                return (
                  <CommandItem
                    key={p.id}
                    value={p.name}
                    onSelect={() => togglePerson(p.id)}
                    aria-selected={on}
                    className="gap-2.5"
                  >
                    <Checkbox checked={on} tabIndex={-1} aria-hidden className="pointer-events-none" />
                    {p.name}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// In the sheet there is no room for a popover-inside-a-sheet, so the list is
// inline with a real checkbox per row and a 44pt row target.
function PeopleList({
  persons,
  selected,
  togglePerson,
}: Pick<ControlProps, "persons" | "selected" | "togglePerson">) {
  const [q, setQ] = useState("");
  const shown = q ? persons.filter((p) => p.name.toLowerCase().includes(q.toLowerCase())) : persons;

  return (
    <div className="rounded-[var(--r-control)] border border-cb-border">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search people…"
        aria-label="Search people"
        className="field !h-11 !rounded-b-none border-0 border-b border-cb-border"
      />
      <ScrollArea className="max-h-56">
        <div className="p-1">
          {shown.length === 0 && (
            <p className="t-small px-3 py-4 text-center text-cb-text-muted">No people found.</p>
          )}
          {shown.map((p) => {
            const on = selected.people.includes(p.id);
            return (
              <Label
                key={p.id}
                className="flex min-h-11 cursor-pointer items-center gap-3 rounded-[var(--r-media)] px-3 text-[0.9375rem] font-medium leading-normal text-cb-text transition-colors duration-150 ease-out hover:bg-cb-surface"
              >
                <Checkbox checked={on} onCheckedChange={() => togglePerson(p.id)} />
                <span className="truncate">{p.name}</span>
              </Label>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

function DateRangePicker({
  selected,
  apply,
  inline,
}: {
  selected: Selected;
  apply: (next: Partial<Selected>) => void;
  inline: boolean;
}) {
  const range: DateRange | undefined = selected.from || selected.to
    ? { from: fromKey(selected.from), to: fromKey(selected.to) }
    : undefined;

  const onSelect = (r: DateRange | undefined) =>
    apply({ from: toKey(r?.from), to: toKey(r?.to) });

  const label = range?.from
    ? range.to
      ? `${format(range.from, "d MMM yyyy")} — ${format(range.to, "d MMM yyyy")}`
      : `From ${format(range.from, "d MMM yyyy")}`
    : "Any date";

  const calendar = (
    <Calendar
      mode="range"
      selected={range}
      onSelect={onSelect}
      defaultMonth={range?.from}
      numberOfMonths={1}
      disabled={{ after: new Date() }}
      captionLayout="dropdown"
      className="w-full [--cell-size:--spacing(9)]"
    />
  );

  if (inline) {
    return (
      <div className="flex flex-col gap-2">
        <div className="rounded-[var(--r-control)] border border-cb-border p-1">{calendar}</div>
        <div className="flex items-center justify-between gap-2">
          <span className="t-small truncate text-cb-text-muted">{label}</span>
          {range?.from && (
            <button
              type="button"
              onClick={() => apply({ from: "", to: "" })}
              className="btn btn-sm btn-tertiary shrink-0"
            >
              Reset
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <Popover>
      <PopoverTrigger className="field justify-between" aria-label={`Date taken: ${label}`}>
        <span className="flex min-w-0 items-center gap-2">
          <CalendarDays className="h-4 w-4 shrink-0 text-cb-text-subtle" aria-hidden />
          <span className={`truncate ${range?.from ? "" : "text-cb-text-subtle font-normal"}`}>
            {label}
          </span>
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-cb-text-subtle" aria-hidden />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start" sideOffset={6}>
        <Calendar
          mode="range"
          selected={range}
          onSelect={onSelect}
          defaultMonth={range?.from}
          numberOfMonths={2}
          disabled={{ after: new Date() }}
          captionLayout="dropdown"
          className="[--cell-size:--spacing(8)]"
        />
        {range?.from && (
          <>
            <Separator className="my-2" />
            <button
              type="button"
              onClick={() => apply({ from: "", to: "" })}
              className="btn btn-sm btn-tertiary w-full"
            >
              Clear dates
            </button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
