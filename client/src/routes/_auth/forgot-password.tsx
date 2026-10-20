import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link } from "@tanstack/react-router";
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

import { useForgotPassword } from "#/hooks/use-forgot-password";

import { forgotPasswordValidator } from "#/validators/forgot-password.validator";

const searchValidator = z.object({
  // Prefilled from the login form when the user had already typed it.
  email: z.email().optional().catch(undefined),
});

export const Route = createFileRoute("/_auth/forgot-password")({
  validateSearch: searchValidator,
  head: () => ({ meta: [{ title: "Forgot password · Rehearse" }] }),
  component: RouteComponent,
});

function RouteComponent() {
  const { email = "" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { sendResetCode, isPending } = useForgotPassword();

  const form = useForm({
    defaultValues: { email },
    validators: {
      onBlur: forgotPasswordValidator,
      onSubmit: forgotPasswordValidator,
    },
    onSubmit: ({ value }) =>
      sendResetCode(value.email, {
        onSuccess: () =>
          navigate({ to: "/reset-password", search: { email: value.email } }),
      }),
  });

  return (
    <>
      <h1 className="font-serif text-3xl tracking-tight">
        Forgot your password?
      </h1>
      <p className="mt-2 text-muted-foreground">
        Enter the email you signed up with and we'll send you a code to set a
        new one.
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
            name="email"
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;

              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="email"
                    autoComplete="email"
                    autoFocus
                    placeholder="you@example.com"
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
              Send reset code
            </Button>
            <FieldDescription className="text-center">
              Remembered it? <Link to="/login">Back to log in</Link>
            </FieldDescription>
          </Field>
        </FieldGroup>
      </form>
    </>
  );
}
