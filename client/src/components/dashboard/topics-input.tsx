import { useState } from "react";
import { X } from "lucide-react";

import { cn } from "#/lib/utils";

import { MAX_TOPICS } from "#/validators/create-interview.validator";

export function TopicsInput({
  id,
  value,
  onChange,
  onBlur,
  isInvalid,
}: {
  id: string;
  value: string[];
  onChange: (topics: string[]) => void;
  onBlur: () => void;
  isInvalid: boolean;
}) {
  const [draft, setDraft] = useState("");
  const isFull = value.length >= MAX_TOPICS;

  const addDraft = () => {
    const topic = draft.trim().slice(0, 100);
    setDraft("");
    // The server dedupes case-insensitively too; doing it here keeps the
    // chips honest about what will be saved.
    if (
      topic &&
      !isFull &&
      !value.some((t) => t.toLowerCase() === topic.toLowerCase())
    ) {
      onChange([...value, topic]);
    }
  };

  return (
    <div
      className={cn(
        "flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-md border border-input px-2 py-1.5 shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 dark:bg-input/30",
        isInvalid &&
          "border-destructive ring-destructive/20 dark:ring-destructive/40",
      )}
    >
      {value.map((topic) => (
        <span
          key={topic}
          className="flex items-center gap-1 rounded-md bg-accent py-0.5 pr-1 pl-2 text-sm text-accent-foreground"
        >
          {topic}
          <button
            type="button"
            aria-label={`Remove ${topic}`}
            onClick={() => onChange(value.filter((t) => t !== topic))}
            className="rounded-sm p-0.5 outline-none hover:bg-background/60 focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        disabled={isFull}
        placeholder={
          isFull
            ? `${MAX_TOPICS} topics added`
            : value.length
              ? "Add another"
              : "Type a topic and press Enter"
        }
        aria-invalid={isInvalid}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addDraft();
          } else if (e.key === "Backspace" && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        // Keep a typed-but-not-entered topic instead of dropping it.
        onBlur={() => {
          addDraft();
          onBlur();
        }}
        className="min-w-32 flex-1 bg-transparent px-1 text-base outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed md:text-sm"
      />
    </div>
  );
}
