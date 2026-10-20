import { AxiosError } from "axios";

export const parseError = (error: Error): string => {
  if (error instanceof AxiosError && error.response?.data.message) {
    return error.response.data.message;
  } else {
    return "Some error occured. Please check your network connection and try again";
  }
};
