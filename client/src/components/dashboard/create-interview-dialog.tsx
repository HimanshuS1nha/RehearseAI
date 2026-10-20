import { useForm } from "@tanstack/react-form";
import { Loader2 } from "lucide-react";

import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { Textarea } from "#/components/ui/textarea";
import { OptionGroup } from "#/components/dashboard/option-group";
import { TopicsInput } from "#/components/dashboard/topics-input";

import { useCreateInterview } from "#/hooks/use-create-interview";

import { isPaymentRequired } from "#/helpers/is-payment-required";

import {
  DIFFICULTY_LABELS,
  EXPERIENCE_LEVEL_LABELS,
  INTERVIEW_TYPE_LABELS,
} from "#/constants/interview-labels";

import {
  createInterviewValidator,
  MAX_TOPICS,
} from "#/validators/create-interview.validator";
import type { CreateInterviewValidatorType } from "#/validators/create-interview.validator";

const DEFAULT_VALUES: CreateInterviewValidatorType = {
  role: "",
  experienceLevel: "mid",
  interviewType: "technical",
  topics: [],
  difficulty: "medium",
  jobDescription: "",
};

export function CreateInterviewDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { createInterview, isPending } = useCreateInterview();

  const form = useForm({
    defaultValues: DEFAULT_VALUES,
    validators: {
      onBlur: createInterviewValidator,
      onSubmit: createInterviewValidator,
    },
    onSubmit: ({ value }) =>
      createInterview(value, {
        onSuccess: () => {
          onOpenChange(false);
          form.reset();
        },
        // Make way for the buy dialog the hook opens. The form keeps what
        // was typed, so it's still there after buying more.
        onError: (error) => isPaymentRequired(error) && onOpenChange(false),
      }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl font-normal tracking-tight">
            New interview
          </DialogTitle>
          <DialogDescription>
            Set it up like the real one. You can start it straight away or come
            back to it later.
          </DialogDescription>
        </DialogHeader>

        <form
          noValidate
          id="create-interview"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <FieldGroup className="gap-6">
            <form.Field
              name="role"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Role</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      placeholder="Backend engineer"
                      autoComplete="off"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                    />
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            />

            <form.Field
              name="experienceLevel"
              children={(field) => (
                <OptionGroup
                  legend="Experience"
                  name={field.name}
                  options={EXPERIENCE_LEVEL_LABELS}
                  value={field.state.value}
                  onChange={field.handleChange}
                />
              )}
            />

            <form.Field
              name="interviewType"
              children={(field) => (
                <OptionGroup
                  legend="Interview type"
                  name={field.name}
                  options={INTERVIEW_TYPE_LABELS}
                  value={field.state.value}
                  onChange={field.handleChange}
                />
              )}
            />

            <form.Field
              name="difficulty"
              children={(field) => (
                <OptionGroup
                  legend="Difficulty"
                  name={field.name}
                  options={DIFFICULTY_LABELS}
                  value={field.state.value}
                  onChange={field.handleChange}
                />
              )}
            />

            <form.Field
              name="topics"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Topics</FieldLabel>
                    <TopicsInput
                      id={field.name}
                      value={field.state.value}
                      onChange={field.handleChange}
                      onBlur={field.handleBlur}
                      isInvalid={isInvalid}
                    />
                    {isInvalid ? (
                      <FieldError errors={field.state.meta.errors} />
                    ) : (
                      <FieldDescription>
                        Up to {MAX_TOPICS}, like the skills on the listing.
                      </FieldDescription>
                    )}
                  </Field>
                );
              }}
            />

            <form.Field
              name="jobDescription"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>
                      Job description{" "}
                      <span className="font-normal text-muted-foreground">
                        (optional)
                      </span>
                    </FieldLabel>
                    <Textarea
                      id={field.name}
                      name={field.name}
                      rows={4}
                      placeholder="Paste the listing and the questions will lean toward what that team cares about."
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      className="max-h-48"
                    />
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            />
          </FieldGroup>
        </form>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" disabled={isPending}>Cancel</Button>
          </DialogClose>
          <Button type="submit" form="create-interview" disabled={isPending}>
            {isPending && <Loader2 className="animate-spin" />}
            Create interview
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
