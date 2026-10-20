import z from "zod";

export const loginValidator = z.object({
  email: z.email("Email must be valid"),
  // Password does not need the 8 characters check on login page
  password: z
    .string("Password is required")
    .trim()
    .min(1, "Password is required"),
});

export type LoginValidatorType = z.infer<typeof loginValidator>;
