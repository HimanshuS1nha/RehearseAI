import { Link } from "@tanstack/react-router";

import { Button } from "#/components/ui/button";
import { Logo } from "#/components/shared/logo";
import { UserButton } from "#/components/shared/user-button";
import { useUser } from "#/hooks/use-user";

type NavLink = { label: string; href: string };

function AuthActions() {
  const { user, isPending } = useUser();

  if (isPending) {
    return (
      <div
        aria-hidden
        className="size-8 animate-pulse rounded-full bg-muted motion-reduce:animate-none"
      />
    );
  }

  if (user) {
    return <UserButton user={user} />;
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        asChild
        className="hidden sm:inline-flex"
      >
        <Link to="/login">Sign in</Link>
      </Button>
      <Button size="sm" asChild>
        <Link to="/register">Start practising</Link>
      </Button>
    </div>
  );
}

export function Navbar({ links = [] }: { links?: NavLink[] }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
        <Logo />

        <ul className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="rounded-sm text-sm text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <AuthActions />
      </nav>
    </header>
  );
}
