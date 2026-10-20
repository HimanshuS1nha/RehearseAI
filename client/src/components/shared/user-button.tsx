import { Link } from "@tanstack/react-router";
import {
  ChevronDown,
  LayoutGrid,
  LogOut,
  Settings,
  Ticket,
} from "lucide-react";

import { Button } from "#/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { useLogout } from "#/hooks/use-logout";

import { useBuyInterviewsDialog } from "#/stores/buy-interviews-dialog.store";

import type { UserType } from "#/types";

const getInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

export function UserButton({ user }: { user: UserType }) {
  const { logout, isPending } = useLogout();
  const openBuyInterviews = useBuyInterviewsDialog((state) => state.open);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 px-1.5 sm:pr-2.5">
          <span
            aria-hidden
            className="flex size-7 items-center justify-center rounded-full bg-primary font-mono text-[11px] font-medium text-primary-foreground"
          >
            {getInitials(user.name)}
          </span>
          <span className="hidden max-w-32 truncate sm:inline">
            {user.name}
          </span>
          <ChevronDown className="hidden text-muted-foreground sm:block" />
          <span className="sr-only">Open account menu</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="truncate">{user.name}</span>
          <span className="truncate text-xs font-normal text-muted-foreground">
            {user.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => openBuyInterviews()}>
          <Ticket />
          Buy interviews
          <span className="ml-auto font-mono text-xs text-muted-foreground tabular-nums">
            {user.interview_credits} left
          </span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/dashboard">
            <LayoutGrid />
            Dashboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/dashboard/settings">
            <Settings />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={isPending}
          onSelect={() => logout()}
        >
          <LogOut />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
