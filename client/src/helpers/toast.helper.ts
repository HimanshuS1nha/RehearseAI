import toast from "react-hot-toast";

import { parseError } from "#/helpers/parse-error";

// An id makes a toast replace the one already shown with that id, e.g. a
// loading toast turning into the result.
export class ToastHelper {
  static success(message: string, id?: string) {
    toast.success(message, { id });
  }
  static error(error: Error) {
    toast.error(parseError(error));
  }
  static info(message: string, id?: string) {
    toast(message, { id });
  }
  static loading(message: string, id?: string) {
    toast.loading(message, { id });
  }
}
