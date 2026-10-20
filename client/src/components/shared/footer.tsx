import { Logo } from "#/components/shared/logo";

export function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex flex-col gap-1">
          <Logo />
          <p className="text-sm text-muted-foreground">
            Practice interviews with feedback you can act on.
          </p>
        </div>
        <p className="font-mono text-xs text-muted-foreground">
          © {new Date().getFullYear()} Rehearse
        </p>
      </div>
    </footer>
  );
}
