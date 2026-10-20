import z from "zod";

export const OTP_LENGTH = 6;

export const verifyOtpValidator = z.object({
  code: z.string().regex(/^\d{6}$/, `Enter the ${OTP_LENGTH}-digit code`),
});

export type VerifyOtpValidatorType = z.infer<typeof verifyOtpValidator>;
