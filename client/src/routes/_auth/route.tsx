import { createFileRoute, Outlet } from "@tanstack/react-router";

import { Logo } from "#/components/shared/logo";
import { AuthAside } from "#/components/auth/auth-aside";

export const Route = createFileRoute("/_auth")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="grid min-h-svh lg:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col px-4 py-6 sm:px-10">
        <Logo className="self-start" />

        <main className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-sm">
            <Outlet />
          </div>
        </main>

        <p className="font-mono text-[11px] text-muted-foreground">
          Practice feedback, not a hiring decision.
        </p>
      </div>

      <AuthAside />
    </div>
  );
}
