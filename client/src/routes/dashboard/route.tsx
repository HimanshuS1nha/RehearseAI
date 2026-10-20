import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import z from "zod";

import { useCheckoutReturn } from "#/hooks/use-checkout-return";

import { userQueryOptions } from "#/queries/user.query";

// Set by Stripe's redirect back after checkout; see useCheckoutReturn.
const searchValidator = z.object({
  checkout_session: z.string().max(255).optional().catch(undefined),
  checkout: z.literal("canceled").optional().catch(undefined),
});

// Guards every dashboard route, with or without the navbar.
export const Route = createFileRoute("/dashboard")({
  validateSearch: searchValidator,
  // Auth only works in the browser: the API's cookies don't reach this server
  // on every setup, and an expired access token can only be refreshed there.
  // The guard and loaders still run before render, just client-side.
  ssr: false,
  beforeLoad: async ({ context }) => {
    try {
      await context.queryClient.query(userQueryOptions);
    } catch {
      throw redirect({ to: "/login" });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { checkout_session, checkout } = Route.useSearch();
  const navigate = Route.useNavigate();

  useCheckoutReturn({
    sessionId: checkout_session,
    isCanceled: checkout === "canceled",
    // Replace, so going back or reloading doesn't report it again.
    onDone: () =>
      navigate({
        search: (prev) => ({
          ...prev,
          checkout_session: undefined,
          checkout: undefined,
        }),
        replace: true,
      }),
  });

  return <Outlet />;
}
