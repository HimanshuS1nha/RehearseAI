import { Footer } from "#/components/shared/footer";
import { Navbar } from "#/components/shared/navbar";
import { createFileRoute, Outlet } from "@tanstack/react-router";

// In-page anchors on the landing page, so plain hrefs rather than routes.
const LANDING_LINKS = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Sample report", href: "#report" },
  { label: "FAQ", href: "#faq" },
];

export const Route = createFileRoute("/_landing-page")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Navbar links={LANDING_LINKS} />
      <Outlet />
      <Footer />
    </>
  );
}
