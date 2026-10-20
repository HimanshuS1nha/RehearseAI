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

import { useLogin } from "#/hooks/use-login";

import { loginValidator } from "#/validators/login.validator";

export const Route = createFileRoute("/_auth/login")({
  head: () => ({ meta: [{ title: "Log in · Rehearse" }] }),
  component: RouteComponent,
});

function RouteComponent() {
  const { login, isPending } = useLogin();

  const form = useForm({
    defaultValues: { email: "", password: "" },
    validators: { onBlur: loginValidator, onSubmit: loginValidator },
    onSubmit: ({ value }) => login(value),
  });

  return (
    <>
      <h1 className="font-serif text-3xl tracking-tight">Welcome back</h1>
      <p className="mt-2 text-muted-foreground">
        Log in to pick up where you left off.
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

          <form.Field
            name="password"
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;

              return (
                <Field data-invalid={isInvalid}>
                  <div className="flex items-center justify-between gap-2">
                    <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                    {/* Carries over the email if it's already typed. */}
                    <form.Subscribe
                      selector={(state) => state.values.email}
                      children={(email) => (
                        <Link
                          to="/forgot-password"
                          search={{
                            email: z.email().safeParse(email).success
                              ? email
                              : undefined,
                          }}
                          className="rounded-sm text-sm text-muted-foreground underline-offset-4 outline-none hover:text-primary hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        >
                          Forgot password?
                        </Link>
                      )}
                    />
                  </div>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="password"
                    autoComplete="current-password"
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
              Log in
            </Button>
            <FieldDescription className="text-center">
              New to Rehearse? <Link to="/register">Create an account</Link>
            </FieldDescription>
          </Field>
        </FieldGroup>
      </form>
    </>
  );
}
