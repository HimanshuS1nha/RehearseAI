import { useMutation, useQueryClient } from "@tanstack/react-query";

import { axios } from "#/lib/axios";

import { isPaymentRequired } from "#/helpers/is-payment-required";
import { ToastHelper } from "#/helpers/toast.helper";

import { API_ROUTES } from "#/constants/api-routes";
import { QUERY_KEYS } from "#/constants/query-keys";

import { useBuyInterviewsDialog } from "#/stores/buy-interviews-dialog.store";

import type { InterviewType } from "#/types";
import type { CreateInterviewValidatorType } from "#/validators/create-interview.validator";

export const useCreateInterview = () => {
  const queryClient = useQueryClient();
  const openBuyInterviews = useBuyInterviewsDialog((state) => state.open);

  const { mutate, isPending } = useMutation({
    mutationFn: async ({
      experienceLevel,
      interviewType,
      jobDescription,
      ...values
    }: CreateInterviewValidatorType) => {
      const { data } = await axios.post<InterviewType>(
        API_ROUTES.interviews.create,
        {
          ...values,
          experience_level: experienceLevel,
          interview_type: interviewType,
          // The server stores an empty description as null.
          job_description: jobDescription,
        },
      );

      return data;
    },
    onSuccess: async () => {
      // Every search's list may now include it, so refetch them all; the
      // user's interview count went down by one.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.getInterviews] }),
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.getUser] }),
      ]);
      ToastHelper.success("Interview created");
      // TODO: Open the new interview once the interview route exists.
    },
    onError: (error) => {
      if (isPaymentRequired(error)) {
        // The count shown was out of date, e.g. one was used in another tab.
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.getUser] });
        openBuyInterviews({ isOutOfCredits: true });
        return;
      }
      ToastHelper.error(error);
    },
  });

  return { createInterview: mutate, isPending };
};
