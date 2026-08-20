import { useEffect, useRef, useState } from "react";
import { CloseIcon, SearchIcon } from "@/lib/icons";
import { Input } from "@/components/ui/input";
import { useCanHover } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** Honoured only on pointer devices — see below. */
  autoFocus?: boolean;
  /** Debounce delay in ms (default 300). */
  debounceMs?: number;
}

export function SearchBar({
  value,
  onChange,
  placeholder = "Search shows...",
  className,
  autoFocus = false,
  debounceMs = 300,
}: SearchBarProps) {
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const canHover = useCanHover();

  // Tracks what we last pushed upward, so an echo of our own value doesn't
  // count as an external change and clobber what's being typed.
  const emitted = useRef(value);

  useEffect(() => {
    if (value !== emitted.current) {
      emitted.current = value;
      setLocalValue(value);
    }
  }, [value]);

  useEffect(() => {
    if (localValue === emitted.current) return;
    const timer = setTimeout(() => {
      emitted.current = localValue;
      onChange(localValue);
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [localValue, debounceMs, onChange]);

  // Autofocus on a phone throws up the keyboard before the page has settled,
  // covering the results the person came to see. Only do it with a cursor.
  useEffect(() => {
    if (autoFocus && canHover) inputRef.current?.focus();
  }, [autoFocus, canHover]);

  return (
    <div className={cn("relative", className)}>
      <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        type="search"
        inputMode="search"
        enterKeyHint="search"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        value={localValue}
        onChange={(e) => setLocalValue(e.currentTarget.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cn(
          "h-12 rounded-xl border-border/60 bg-muted/50 pl-11 pr-12",
          "placeholder:text-muted-foreground/50",
          "focus-visible:border-primary/50 focus-visible:ring-primary/20",
          // Safari renders its own clear affordance on type=search.
          "[&::-webkit-search-cancel-button]:appearance-none"
        )}
      />
      {localValue && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            setLocalValue("");
            emitted.current = "";
            onChange("");
            inputRef.current?.focus();
          }}
          className="absolute right-1 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground press can-hover:hover:text-foreground"
        >
          <CloseIcon className="size-4" />
        </button>
      )}
    </div>
  );
}
