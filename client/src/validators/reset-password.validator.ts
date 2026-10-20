import z from "zod";

// Limits mirror ResetPasswordRequest on the server.
export const resetPasswordValidator = z
  .object({
    code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
    newPassword: z
      .string("Password is required")
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password must be at most 128 characters"),
    confirmNewPassword: z.string("Confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords do not match",
    path: ["confirmNewPassword"],
  });

export type ResetPasswordValidatorType = z.infer<typeof resetPasswordValidator>;
