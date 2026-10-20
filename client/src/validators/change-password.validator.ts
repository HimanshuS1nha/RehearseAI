import z from "zod";

// Limits mirror ChangePasswordRequest on the server.
export const changePasswordValidator = z
  .object({
    currentPassword: z
      .string("Current password is required")
      .min(1, "Current password is required")
      .max(128, "Password must be at most 128 characters"),
    newPassword: z
      .string("Password is required")
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password must be at most 128 characters"),
    confirmNewPassword: z.string("Confirm your password"),
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "New password must be different from the current one",
    path: ["newPassword"],
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords do not match",
    path: ["confirmNewPassword"],
  });

export type ChangePasswordValidatorType = z.infer<
  typeof changePasswordValidator
>;
