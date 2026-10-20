import z from "zod";

export const forgotPasswordValidator = z.object({
  email: z.email("Email must be valid"),
});

export type ForgotPasswordValidatorType = z.infer<
  typeof forgotPasswordValidator
>;
