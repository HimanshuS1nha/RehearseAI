import { Link } from "@tanstack/react-router";

import { cn } from "#/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      className={cn(
        "inline-flex items-baseline gap-1 rounded-sm font-serif text-xl tracking-tight outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        className,
      )}
    >
      <span className="italic">rehearse</span>
      <span aria-hidden className="size-1.5 rounded-full bg-primary" />
    </Link>
  );
}
