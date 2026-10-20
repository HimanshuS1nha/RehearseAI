import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { Loader2 } from "lucide-react";
import z from "zod";

import { Button } from "#/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "#/components/ui/input-otp";

import { useCooldown } from "#/hooks/use-cooldown";
import { useForgotPassword } from "#/hooks/use-forgot-password";
import { useResetPassword } from "#/hooks/use-reset-password";

import { resetPasswordValidator } from "#/validators/reset-password.validator";
import { OTP_LENGTH } from "#/validators/verify-otp.validator";

// Matches the server's resend cooldown, which ignores requests sent sooner.
const RESEND_COOLDOWN_SECONDS = 60;

const searchValidator = z.object({
  // A bad or missing email falls back to "" so beforeLoad can redirect.
  email: z.email().catch(""),
});

export const Route = createFileRoute("/_auth/reset-password")({
  validateSearch: searchValidator,
  beforeLoad: ({ search }) => {
    if (!search.email) {
      throw redirect({ to: "/forgot-password" });
    }
  },
  head: () => ({ meta: [{ title: "Reset password · Rehearse" }] }),
  component: RouteComponent,
});

function RouteComponent() {
  const { email } = Route.useSearch();
  const { resetPassword, isPending } = useResetPassword();
  const { sendResetCode, isPending: isResending } = useForgotPassword();
  const { secondsLeft, restart } = useCooldown(RESEND_COOLDOWN_SECONDS);

  const form = useForm({
    defaultValues: { code: "", newPassword: "", confirmNewPassword: "" },
    validators: {
      onBlur: resetPasswordValidator,
      onSubmit: resetPasswordValidator,
    },
    onSubmit: ({ value }) =>
      resetPassword(
        { email, ...value },
        // A wrong code is the likely failure; keep the passwords typed.
        { onError: () => form.resetField("code") },
      ),
  });

  return (
    <>
      <h1 className="font-serif text-3xl tracking-tight">
        Choose a new password
      </h1>
      <p className="mt-2 text-muted-foreground">
        If an account exists for{" "}
        <span className="font-medium break-all text-foreground">{email}</span>,
        we've sent it a {OTP_LENGTH}-digit code. It expires in 10 minutes.
      </p>

      <form
        noValidate
        className="mt-8"
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
      >
        <FieldGroup className="gap-5">
          <form.Field
            name="code"
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;

              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Reset code</FieldLabel>
                  <InputOTP
                    id={field.name}
                    name={field.name}
                    maxLength={OTP_LENGTH}
                    pattern={REGEXP_ONLY_DIGITS}
                    autoComplete="one-time-code"
                    autoFocus
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={field.handleChange}
                  >
                    <InputOTPGroup>
                      {Array.from({ length: OTP_LENGTH }, (_, index) => (
                        <InputOTPSlot
                          key={index}
                          index={index}
                          aria-invalid={isInvalid}
                          className="size-11 font-mono text-lg"
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                  {isInvalid ? (
                    <FieldError errors={field.state.meta.errors} />
                  ) : (
                    <FieldDescription>
                      Didn't get it?{" "}
                      {secondsLeft > 0 ? (
                        <span className="font-mono tabular-nums">
                          Resend in {secondsLeft}s
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={isResending}
                          className="rounded-sm underline underline-offset-4 outline-none hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
                          onClick={() =>
                            sendResetCode(email, { onSuccess: restart })
                          }
                        >
                          Resend code
                        </button>
                      )}
                    </FieldDescription>
                  )}
                </Field>
              );
            }}
          />

          <form.Field
            name="newPassword"
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;

              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>New password</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="password"
                    autoComplete="new-password"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                  />
                  {isInvalid ? (
                    <FieldError errors={field.state.meta.errors} />
                  ) : (
                    <FieldDescription>At least 8 characters.</FieldDescription>
                  )}
                </Field>
              );
            }}
          />

          <form.Field
            name="confirmNewPassword"
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;

              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>
                    Confirm new password
                  </FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="password"
                    autoComplete="new-password"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          />

          <Field>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="animate-spin" />}
              Reset password
            </Button>
            <FieldDescription className="text-center">
              Wrong email?{" "}
              <Link to="/forgot-password" search={{ email }}>
                Use a different one
              </Link>
            </FieldDescription>
            <FieldDescription className="text-center">
              You'll be logged out on every device.
            </FieldDescription>
          </Field>
        </FieldGroup>
      </form>
    </>
  );
}
