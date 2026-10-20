import { useForm } from "@tanstack/react-form";
import { Loader2, Trash2 } from "lucide-react";

import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";

import { useDeleteAccount } from "#/hooks/use-delete-account";

import { deleteAccountValidator } from "#/validators/delete-account.validator";

export function DeleteAccountDialog() {
  const { deleteAccount, isPending } = useDeleteAccount();

  const form = useForm({
    defaultValues: { password: "" },
    validators: { onSubmit: deleteAccountValidator },
    onSubmit: ({ value }) => deleteAccount(value),
  });

  return (
    <Dialog
      // Start empty each time, so a typed password doesn't linger.
      onOpenChange={(open) => !open && form.reset()}
    >
      <DialogTrigger asChild>
        <Button variant="destructive">
          <Trash2 />
          Delete account
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl font-normal tracking-tight">
            Delete your account?
          </DialogTitle>
          <DialogDescription>
            Every interview, answer and report goes with it, and you'll be
            logged out everywhere. This can't be undone.
          </DialogDescription>
        </DialogHeader>

        <form
          noValidate
          id="delete-account"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <form.Field
            name="password"
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;

              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>
                    Enter your password to confirm
                  </FieldLabel>
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
        </form>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Keep my account</Button>
          </DialogClose>
          <Button
            type="submit"
            form="delete-account"
            variant="destructive"
            disabled={isPending}
          >
            {isPending && <Loader2 className="animate-spin" />}
            Delete account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
