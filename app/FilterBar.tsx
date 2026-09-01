"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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

  function togglePerson(id: string) {
    apply({
      people: selected.people.includes(id)
        ? selected.people.filter((x) => x !== id)
        : [...selected.people, id],
    });
  }

  const nameById = (id: string) => persons.find((p) => p.id === id)?.name ?? id;
  const hasFilters =
    selected.people.length > 0 || selected.folder || selected.from || selected.to;

  const inputCls =
    "h-11 rounded-2xl border border-cb-border px-3 text-sm font-medium text-cb-text outline-none transition-colors duration-150 ease-out focus:border-cb-blue";

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-cb-border p-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* People multi-select */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger className={`${inputCls} flex items-center gap-2`}>
            People
            {selected.people.length > 0 && (
              <span className="rounded-full bg-cb-blue px-1.5 text-xs font-bold text-white">
                {selected.people.length}
              </span>
            )}
            <ChevronsUpDown className="h-4 w-4 text-cb-text-muted" />
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start">
            <Command>
              <CommandInput placeholder="Search people…" />
              <CommandList>
                <CommandEmpty>No people found.</CommandEmpty>
                <CommandGroup>
                  {persons.map((p) => (
                    <CommandItem key={p.id} value={p.name} onSelect={() => togglePerson(p.id)}>
                      <Check
                        className={`mr-2 h-4 w-4 ${
                          selected.people.includes(p.id) ? "opacity-100" : "opacity-0"
                        }`}
                      />
                      {p.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Source folder */}
        <Select
          value={selected.folder || "all"}
          onValueChange={(v) => apply({ folder: !v || v === "all" ? "" : String(v) })}
        >
          <SelectTrigger className="!h-11 rounded-2xl border-cb-border">
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

        {/* Date range (native pickers) */}
        <input
          type="date"
          aria-label="From date"
          value={selected.from}
          max={selected.to || undefined}
          onChange={(e) => apply({ from: e.target.value })}
          className={inputCls}
        />
        <span className="text-sm text-cb-text-muted">to</span>
        <input
          type="date"
          aria-label="To date"
          value={selected.to}
          min={selected.from || undefined}
          onChange={(e) => apply({ to: e.target.value })}
          className={inputCls}
        />

        {hasFilters && (
          <button
            onClick={() => apply({ people: [], folder: "", from: "", to: "" })}
            className="flex h-11 items-center gap-1 rounded-2xl px-3 text-sm font-bold text-cb-blue transition-colors duration-150 ease-out hover:text-cb-blue-hover"
          >
            <X className="h-4 w-4" /> Clear
          </button>
        )}
      </div>

      {/* Selected people as removable chips */}
      {selected.people.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.people.map((id) => (
            <button
              key={id}
              onClick={() => togglePerson(id)}
              className="flex items-center gap-1 rounded-full bg-cb-blue-subtle px-3 py-1 text-xs font-medium text-cb-blue transition-colors duration-150 ease-out hover:bg-cb-border"
            >
              {nameById(id)}
              <X className="h-3 w-3" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
