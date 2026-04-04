"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type SearchableAutocompleteOption = {
  value: string;
  label: string;
  secondaryLabel?: string;
  searchText?: string;
};

type SearchableAutocompleteInputProps = {
  label: string;
  placeholder: string;
  options: SearchableAutocompleteOption[];
  value: string;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSelect: (option: SearchableAutocompleteOption | null) => void;
  onClear?: () => void;
  emptyMessage?: string;
  disabled?: boolean;
};

function normalizeText(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

export function SearchableAutocompleteInput({
  label,
  placeholder,
  options,
  value,
  inputValue,
  onInputChange,
  onSelect,
  onClear,
  emptyMessage = "No matches found.",
  disabled,
}: SearchableAutocompleteInputProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const filteredOptions = useMemo(() => {
    const query = normalizeText(inputValue);
    if (!query) return options;
    return options.filter((option) => {
      const haystack = [option.label, option.secondaryLabel, option.searchText]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [inputValue, options]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [inputValue]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const selectedOption = options.find((option) => option.value === value) ?? null;

  function handleSelect(option: SearchableAutocompleteOption) {
    onSelect(option);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative space-y-1.5">
      <div className="text-sm font-medium">{label}</div>
      <Input
        value={inputValue}
        placeholder={placeholder}
        disabled={disabled}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-label={label}
        onFocus={() => {
          if (!disabled) setOpen(true);
        }}
        onChange={(event) => {
          const nextValue = event.target.value;
          onInputChange(nextValue);
          if (!nextValue && value && onClear) {
            onClear();
          }
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
            event.preventDefault();
            setOpen(true);
            return;
          }

          if (event.key === "ArrowDown") {
            event.preventDefault();
            if (filteredOptions.length === 0) return;
            setHighlightedIndex((current) =>
              current >= filteredOptions.length - 1 ? 0 : current + 1
            );
            return;
          }

          if (event.key === "ArrowUp") {
            event.preventDefault();
            if (filteredOptions.length === 0) return;
            setHighlightedIndex((current) =>
              current <= 0 ? filteredOptions.length - 1 : current - 1
            );
            return;
          }

          if (event.key === "Enter" && open && filteredOptions.length > 0) {
            event.preventDefault();
            const option = filteredOptions[highlightedIndex] ?? filteredOptions[0];
            if (option) handleSelect(option);
            return;
          }

          if (event.key === "Escape") {
            event.preventDefault();
            setOpen(false);
          }
        }}
      />

      {open ? (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full z-[80] mt-1 overflow-hidden rounded-md border border-border bg-popover shadow-md"
        >
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">{emptyMessage}</div>
          ) : (
            <div className="max-h-60 overflow-auto py-1">
              {filteredOptions.map((option, index) => {
                const active = index === highlightedIndex;
                const selected = selectedOption?.value === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={cn(
                      "flex w-full flex-col items-start px-3 py-2 text-left text-sm transition",
                      active ? "bg-accent text-accent-foreground" : "hover:bg-accent/60",
                      selected ? "font-medium" : "font-normal"
                    )}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      handleSelect(option);
                    }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    <span>{option.label}</span>
                    {option.secondaryLabel ? (
                      <span className="text-xs text-muted-foreground">{option.secondaryLabel}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
