import type { ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { ChangePasswordForm } from "#/components/settings/change-password-form";
import { DeleteAccountDialog } from "#/components/settings/delete-account-dialog";

export const Route = createFileRoute("/dashboard/_with-navbar/settings")({
  head: () => ({ meta: [{ title: "Settings · Rehearse" }] }),
  component: RouteComponent,
});

// A heading and note on the left, the controls on the right; stacked on
// narrow screens.
function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-6 border-t py-10 md:grid-cols-[1fr_2fr] md:gap-12">
      <div>
        <h2 className="font-serif text-xl">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      <div>{children}</div>
    </section>
  );
}

function RouteComponent() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:py-14">
      <h1 className="font-serif text-3xl tracking-tight sm:text-4xl">
        Settings
      </h1>

      <div className="mt-10">
        <SettingsSection
          title="Change password"
          description="Other devices are logged out when you change it. This one stays logged in."
        >
          <ChangePasswordForm />
        </SettingsSection>

        <SettingsSection
          title="Delete account"
          description="Deletes your account along with every interview, answer and report. This can't be undone."
        >
          <DeleteAccountDialog />
        </SettingsSection>
      </div>
    </main>
  );
}
