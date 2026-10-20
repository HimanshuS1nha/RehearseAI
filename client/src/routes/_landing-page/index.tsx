import { createFileRoute } from "@tanstack/react-router";

import { ClosingCta } from "#/components/home/closing-cta";
import { Faq } from "#/components/home/faq";
import { Hero } from "#/components/home/hero";
import { HowItWorks } from "#/components/home/how-it-works";
import { ReportPreview } from "#/components/home/report-preview";
import { SetupSection } from "#/components/home/setup-section";

export const Route = createFileRoute("/_landing-page/")({
  component: Home,
});

function Home() {
  return (
    <main>
      <Hero />
      <SetupSection />
      <HowItWorks />
      <ReportPreview />
      <Faq />
      <ClosingCta />
    </main>
  );
}
