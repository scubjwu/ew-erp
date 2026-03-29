"use client";

import { ChevronsUpDown, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type ComboboxOption = {
  value: string;
  label: string;
  meta?: Record<string, string | undefined>;
};

type SearchableComboboxProps = {
  label: string;
  placeholder: string;
  value: string;
  onSelect: (option: ComboboxOption | null) => void;
  options: ComboboxOption[];
  loading?: boolean;
  required?: boolean;
  disabled?: boolean;
  onSearchChange: (query: string) => void;
};

export function SearchableCombobox({
  label,
  placeholder,
  value,
  onSelect,
  options,
  loading,
  required,
  disabled,
  onSearchChange,
}: SearchableComboboxProps) {
  const selected = options.find((o) => o.value === value) ?? null;

  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">
        {label}
        {required ? <span className="text-destructive"> *</span> : ""}
      </label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="h-9 w-full justify-between text-left font-normal"
            disabled={disabled}
          >
            <span className="truncate">{selected?.label ?? placeholder}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[360px] p-2" align="start">
          <Input
            className="h-8"
            placeholder={`Search ${label.toLowerCase()}...`}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <div className="mt-2 max-h-56 overflow-auto rounded-md border">
            {loading ? (
              <p className="p-2 text-xs text-muted-foreground">Loading...</p>
            ) : options.length === 0 ? (
              <p className="p-2 text-xs text-muted-foreground">No results.</p>
            ) : (
              <div className="p-1">
                {options.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                    onClick={() => onSelect(option)}
                  >
                    <Check
                      className={cn(
                        "h-4 w-4",
                        option.value === value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="truncate">{option.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2 h-8 text-muted-foreground"
              onClick={() => onSelect(null)}
            >
              Clear
            </Button>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
