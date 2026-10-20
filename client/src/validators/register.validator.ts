import z from "zod";

export const registerValidator = z
  .object({
    name: z
      .string("Name is required")
      .trim()
      .min(1, "Name is required")
      .max(255, "Name must be at most 255 characters"),
    email: z.email("Email must be valid").max(255, "Email is too long"),
    password: z
      .string("Password is required")
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password must be at most 128 characters"),
    confirmPassword: z.string("Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterValidatorType = z.infer<typeof registerValidator>;
