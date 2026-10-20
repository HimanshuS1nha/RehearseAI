import { Loader2, Search } from "lucide-react";

import { Input } from "#/components/ui/input";

export function InterviewSearch({
  value,
  onChange,
  isSearching,
}: {
  value: string;
  onChange: (value: string) => void;
  isSearching: boolean;
}) {
  return (
    <div className="relative w-full sm:max-w-xs">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        aria-label="Search interviews"
        placeholder="Search by role or topic"
        maxLength={100}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pr-9 pl-9"
      />
      {isSearching && (
        <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      )}
    </div>
  );
}
