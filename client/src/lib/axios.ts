import axiosLib, { isAxiosError } from "axios";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";

import { API_ROUTES } from "#/constants/api-routes";

declare module "axios" {
  interface InternalAxiosRequestConfig {
    // Set once a request has been retried after a refresh, so it can't loop.
    _retried?: boolean;
  }
}

export const axios = axiosLib.create({
  baseURL: import.meta.env.VITE_PUBLIC_API_URL + "/api",
  withCredentials: true,
});

// The browser attaches the auth cookies itself. During SSR the request comes
// from this server instead, so pass on the cookies the visitor sent us.
const getForwardedCookie = createIsomorphicFn()
  .server(() => getRequestHeader("cookie"))
  .client(() => undefined);

// Only the browser refreshes. The refresh cookie is scoped to the API's
// /api/auth path, so it never reaches this server, and a refresh made here
// would rotate the token without the browser ever getting the new one.
const canRefresh = createIsomorphicFn()
  .server(() => false)
  .client(() => true);

// These answer 401 for their own reasons (wrong password, dead session), so a
// refresh wouldn't help and, for refresh itself, would loop.
const NO_REFRESH_URLS: string[] = [
  API_ROUTES.auth.login,
  API_ROUTES.auth.refresh,
];

// Shared by every request that hits a 401 at the same time. The server rotates
// the refresh token on each use and revokes the session if an old one is sent
// again, so parallel refreshes would log the user out.
let refreshPromise: Promise<unknown> | null = null;

axios.interceptors.request.use((config) => {
  const cookie = getForwardedCookie();
  if (cookie) {
    config.headers.set("Cookie", cookie);
  }

  return config;
});

axios.interceptors.response.use(undefined, async (error) => {
  const config = isAxiosError(error) ? error.config : undefined;

  if (
    !config ||
    error.response?.status !== 401 ||
    config._retried ||
    NO_REFRESH_URLS.includes(config.url ?? "") ||
    !canRefresh()
  ) {
    throw error;
  }

  config._retried = true;
  refreshPromise ??= axios.post(API_ROUTES.auth.refresh).finally(() => {
    refreshPromise = null;
  });

  try {
    await refreshPromise;
  } catch {
    // The session is gone and the server has cleared the cookies. Surface the
    // original 401 so callers treat it as signed out.
    throw error;
  }

  return axios(config);
});
