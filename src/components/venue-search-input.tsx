"use client";

import { Check, Loader2, MapPin, Search } from "lucide-react";
import { KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { locationAnswer, type LocationSuggestion } from "@/lib/location-search";

type VenueSearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

type SearchResponse = {
  suggestions?: LocationSuggestion[];
  provider?: "google" | "openstreetmap" | null;
  error?: string;
};

export function VenueSearchInput({ value, onChange, disabled = false }: VenueSearchInputProps) {
  const inputId = useId();
  const listboxId = `${inputId}-results`;
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [provider, setProvider] = useState<SearchResponse["provider"]>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(Boolean(value));
  const [activeIndex, setActiveIndex] = useState(-1);
  const [error, setError] = useState("");
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isConfirmed || query.trim().length < 2) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setIsLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/locations/search?q=${encodeURIComponent(query.trim())}`, {
          signal: controller.signal,
        });
        const payload = await response.json() as SearchResponse;
        if (!response.ok) throw new Error(payload.error || "Location search is temporarily unavailable.");
        setSuggestions(payload.suggestions ?? []);
        setProvider(payload.provider ?? null);
        setActiveIndex(-1);
        setIsOpen(true);
      } catch (searchError) {
        if (controller.signal.aborted) return;
        setSuggestions([]);
        setError(searchError instanceof Error ? searchError.message : "Location search is temporarily unavailable.");
        setIsOpen(true);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [isConfirmed, query]);

  function selectSuggestion(suggestion: LocationSuggestion) {
    const answer = locationAnswer(suggestion);
    setQuery(answer);
    setIsConfirmed(true);
    setIsOpen(false);
    setSuggestions([]);
    setError("");
    onChange(answer);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (!isOpen || suggestions.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => (current <= 0 ? suggestions.length - 1 : current - 1));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      selectSuggestion(suggestions[activeIndex]);
    }
  }

  return (
    <div className="mt-1.5">
      <label htmlFor={inputId} className="sr-only">Search for a venue or city</label>
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-violet-300" />
        <input
          id={inputId}
          type="search"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
          autoComplete="off"
          value={query}
          onChange={(event) => {
            const nextQuery = event.target.value;
            setQuery(nextQuery);
            setIsConfirmed(false);
            setSuggestions([]);
            setIsLoading(false);
            setIsOpen(Boolean(nextQuery.trim()));
            onChange("");
          }}
          onFocus={() => {
            if (blurTimer.current) clearTimeout(blurTimer.current);
            if (!isConfirmed && query.trim()) setIsOpen(true);
          }}
          onBlur={() => {
            blurTimer.current = setTimeout(() => setIsOpen(false), 150);
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Search a venue or city"
          className="w-full rounded-lg border border-white/10 bg-[#181818] py-2 pl-9 pr-9 text-[12px] text-white outline-none placeholder:text-[#777780] focus:border-violet-400/60 focus:ring-2 focus:ring-violet-400/15 disabled:opacity-60"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
          {isLoading ? <Loader2 className="size-3.5 animate-spin text-violet-300" /> : isConfirmed ? <Check className="size-3.5 text-emerald-400" /> : <Search className="size-3.5 text-[#777780]" />}
        </span>

        {isOpen ? (
          <div id={listboxId} role="listbox" className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-white/10 bg-[#202020] p-1 shadow-2xl">
            {suggestions.map((suggestion, index) => (
              <button
                id={`${listboxId}-${index}`}
                key={suggestion.id}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectSuggestion(suggestion)}
                className={`block w-full rounded-md px-3 py-2 text-left transition ${index === activeIndex ? "bg-violet-500/20" : "hover:bg-white/[0.07]"}`}
              >
                <span className="block text-[12px] font-medium text-white">{suggestion.label}</span>
                {suggestion.secondary ? <span className="mt-0.5 block truncate text-[10px] text-[#aaaab2]">{suggestion.secondary}</span> : null}
              </button>
            ))}
            {!isLoading && !error && query.trim().length >= 2 && suggestions.length === 0 ? (
              <p className="px-3 py-3 text-[11px] text-[#aaaab2]">No matching place found. Try a venue name plus its city.</p>
            ) : null}
            {error ? <p className="px-3 py-3 text-[11px] text-amber-300" role="status">{error} Try again in a moment.</p> : null}
          </div>
        ) : null}
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-3 text-[10px]">
        <span className={isConfirmed ? "text-emerald-400" : "text-[#8f8f96]"}>
          {isConfirmed ? "Location confirmed" : "Choose a suggestion to confirm the location."}
        </span>
        {provider === "openstreetmap" ? (
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="shrink-0 text-[#8f8f96] hover:text-white hover:underline">
            © OpenStreetMap
          </a>
        ) : provider === "google" ? (
          <span className="shrink-0 text-[#8f8f96]">Google Places</span>
        ) : null}
      </div>
    </div>
  );
}
