import { createFileRoute, Outlet } from "@tanstack/react-router";

import { Navbar } from "#/components/shared/navbar";

export const Route = createFileRoute("/dashboard/_with-navbar")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Navbar />
      <Outlet />
    </>
  );
}
