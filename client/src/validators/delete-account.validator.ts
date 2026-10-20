import z from "zod";

export const deleteAccountValidator = z.object({
  password: z
    .string("Password is required")
    .min(1, "Password is required")
    .max(128, "Password must be at most 128 characters"),
});

export type DeleteAccountValidatorType = z.infer<typeof deleteAccountValidator>;
