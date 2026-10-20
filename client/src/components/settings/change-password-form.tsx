import { useForm } from "@tanstack/react-form";
import { Loader2 } from "lucide-react";

import { Button } from "#/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "#/components/ui/field";
import { Input } from "#/components/ui/input";

import { useChangePassword } from "#/hooks/use-change-password";

import { changePasswordValidator } from "#/validators/change-password.validator";

const FIELDS = [
  {
    name: "currentPassword",
    label: "Current password",
    autoComplete: "current-password",
  },
  {
    name: "newPassword",
    label: "New password",
    autoComplete: "new-password",
    description: "At least 8 characters.",
  },
  {
    name: "confirmNewPassword",
    label: "Confirm new password",
    autoComplete: "new-password",
  },
] as const;

export function ChangePasswordForm() {
  const { changePassword, isPending } = useChangePassword();

  const form = useForm({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
    validators: {
      onBlur: changePasswordValidator,
      onSubmit: changePasswordValidator,
    },
    onSubmit: ({ value }) =>
      changePassword(value, { onSuccess: () => form.reset() }),
  });

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <FieldGroup className="max-w-sm gap-5">
        {FIELDS.map((input) => (
          <form.Field
            key={input.name}
            name={input.name}
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;

              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>{input.label}</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="password"
                    autoComplete={input.autoComplete}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                  />
                  {isInvalid ? (
                    <FieldError errors={field.state.meta.errors} />
                  ) : (
                    "description" in input && (
                      <FieldDescription>{input.description}</FieldDescription>
                    )
                  )}
                </Field>
              );
            }}
          />
        ))}

        <Field orientation="horizontal">
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="animate-spin" />}
            Change password
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
