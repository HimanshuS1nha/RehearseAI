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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "#/components/ui/input-otp";

import { useCooldown } from "#/hooks/use-cooldown";
import { useResendOtp } from "#/hooks/use-resend-otp";
import { useVerifyOtp } from "#/hooks/use-verify-otp";

import {
  OTP_LENGTH,
  verifyOtpValidator,
} from "#/validators/verify-otp.validator";

// Matches the server's resend cooldown, which ignores requests sent sooner.
const RESEND_COOLDOWN_SECONDS = 60;

const searchValidator = z.object({
  // A bad or missing email falls back to "" so beforeLoad can redirect.
  email: z.email().catch(""),
});

export const Route = createFileRoute("/_auth/verify-otp")({
  validateSearch: searchValidator,
  beforeLoad: ({ search }) => {
    if (!search.email) {
      throw redirect({ to: "/register" });
    }
  },
  head: () => ({ meta: [{ title: "Verify your email · Rehearse" }] }),
  component: RouteComponent,
});

function RouteComponent() {
  const { email } = Route.useSearch();
  const { verifyOtp, isPending } = useVerifyOtp();
  const { resendOtp, isPending: isResending } = useResendOtp();

  const { secondsLeft, restart } = useCooldown(RESEND_COOLDOWN_SECONDS);

  const form = useForm({
    defaultValues: { code: "" },
    validators: { onSubmit: verifyOtpValidator },
    onSubmit: ({ value }) =>
      verifyOtp(
        { email, code: value.code },
        // Clear the slots so the next attempt starts fresh.
        { onError: () => form.reset() },
      ),
  });

  return (
    <>
      <h1 className="font-serif text-3xl tracking-tight">Check your email</h1>
      <p className="mt-2 text-muted-foreground">
        We sent a {OTP_LENGTH}-digit code to{" "}
        <span className="font-medium break-all text-foreground">{email}</span>.
        It expires in 10 minutes.
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
                  <FieldLabel htmlFor={field.name}>
                    Verification code
                  </FieldLabel>
                  <InputOTP
                    id={field.name}
                    name={field.name}
                    maxLength={OTP_LENGTH}
                    pattern={REGEXP_ONLY_DIGITS}
                    autoComplete="one-time-code"
                    autoFocus
                    disabled={isPending}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={field.handleChange}
                    // Submit as soon as the last digit is in.
                    onComplete={() => form.handleSubmit()}
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
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          />

          <Field>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="animate-spin" />}
              Verify email
            </Button>
            <FieldDescription className="text-center">
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
                  onClick={() => resendOtp(email, { onSuccess: restart })}
                >
                  Resend code
                </button>
              )}
            </FieldDescription>
            <FieldDescription className="text-center">
              Wrong email?{" "}
              <Link to="/register">Sign up with a different one</Link>
            </FieldDescription>
          </Field>
        </FieldGroup>
      </form>
    </>
  );
}
