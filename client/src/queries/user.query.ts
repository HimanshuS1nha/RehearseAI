import { queryOptions } from "@tanstack/react-query";

import { axios } from "#/lib/axios";

import { API_ROUTES } from "#/constants/api-routes";
import { QUERY_KEYS } from "#/constants/query-keys";

import type { UserType } from "#/types";

// Shared by useUser and the dashboard's auth check, so both read one cache entry.
export const userQueryOptions = queryOptions({
  queryKey: [QUERY_KEYS.getUser],
  queryFn: async () => {
    const { data } = await axios.get<UserType>(API_ROUTES.auth.getUser);

    return data;
  },
  // A 401 just means signed out, so don't hold the navbar on retries.
  retry: false,
});
