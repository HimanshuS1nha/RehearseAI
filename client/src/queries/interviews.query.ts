import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

import { axios } from "#/lib/axios";

import { API_ROUTES } from "#/constants/api-routes";
import { QUERY_KEYS } from "#/constants/query-keys";

import type {
  InterviewResultsType,
  InterviewType,
  PaginatedResponseType,
} from "#/types";

const PAGE_SIZE = 12;

export const interviewsQueryOptions = (search: string) =>
  infiniteQueryOptions({
    queryKey: [QUERY_KEYS.getInterviews, search],
    queryFn: async ({ pageParam }) => {
      const { data } = await axios.get<PaginatedResponseType<InterviewType>>(
        API_ROUTES.interviews.list,
        {
          params: {
            offset: pageParam,
            limit: PAGE_SIZE,
            search: search || undefined,
          },
        },
      );

      return data;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.offset + lastPage.limit : undefined,
  });

export const interviewQueryOptions = (id: string) =>
  queryOptions({
    queryKey: [QUERY_KEYS.getInterview, id],
    queryFn: async () => {
      const { data } = await axios.get<InterviewType>(
        API_ROUTES.interviews.detail(id),
      );

      return data;
    },
  });

export const interviewResultsQueryOptions = (id: string) =>
  queryOptions({
    queryKey: [QUERY_KEYS.getInterviewResults, id],
    queryFn: async () => {
      const { data } = await axios.get<InterviewResultsType>(
        API_ROUTES.interviews.results(id),
      );

      return data;
    },
    // A completed interview's report never changes.
    staleTime: Infinity,
  });
