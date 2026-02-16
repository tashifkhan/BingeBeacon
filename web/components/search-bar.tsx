"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  /** Debounce delay in ms (default 300) */
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

  // Sync from parent
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [localValue, debounceMs, onChange, value]);

  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.currentTarget.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={cn(
          "h-11 pl-9 pr-9 bg-muted/50 border-border/50 rounded-xl",
          "placeholder:text-muted-foreground/50",
          "focus-visible:border-primary/50 focus-visible:ring-primary/20"
        )}
      />
      {localValue && (
        <button
          type="button"
          onClick={() => {
            setLocalValue("");
            onChange("");
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
