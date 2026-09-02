"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, FolderClosed, Search, User, X } from "lucide-react";
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

  const togglePerson = (id: string) =>
    apply({
      people: selected.people.includes(id)
        ? selected.people.filter((x) => x !== id)
        : [...selected.people, id],
    });

  // Folder is single-select: picking the active one clears it.
  const toggleFolder = (id: string) => apply({ folder: selected.folder === id ? "" : id });

  const clearAll = () => apply({ people: [], folder: "", from: "", to: "" });

  const personName = (id: string) => persons.find((p) => p.id === id)?.name ?? id;
  const folderName = (id: string) => folders.find((f) => f.id === id)?.name ?? id;
  const activeCount = selected.people.length + (selected.folder ? 1 : 0);

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
    <section aria-label="Filters" className="flex flex-col gap-3">
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
          Search people or folders…
        </span>
        {activeCount > 0 && (
          <span className="count shrink-0">{activeCount}</span>
        )}
        <kbd className="hidden shrink-0 items-center gap-0.5 rounded-md border border-cb-border bg-cb-grey-100 px-1.5 py-0.5 font-sans text-[11px] font-bold text-cb-text-muted sm:flex">
          <span className="text-[13px] leading-none">⌘</span>K
        </kbd>
      </button>

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
          <button type="button" onClick={clearAll} className="btn btn-sm btn-tertiary">
            Clear all
          </button>
        </div>
      )}

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Filter photos"
        description="Search people and folders to narrow the gallery."
        className="sm:max-w-lg"
      >
        <Command
          // Keep the list open while toggling several people in a row.
          shouldFilter
          className="[&_[data-slot=command-input-wrapper]]:p-2"
        >
          <CommandInput placeholder="Search people or folders…" />
          <CommandList className="max-h-[60dvh]">
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
          </CommandList>
        </Command>
      </CommandDialog>
    </section>
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
