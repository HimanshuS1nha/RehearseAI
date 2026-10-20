import { isAxiosError } from "axios";

// The server answers 402 when creating an interview with none left.
export const isPaymentRequired = (error: Error) =>
  isAxiosError(error) && error.response?.status === 402;
