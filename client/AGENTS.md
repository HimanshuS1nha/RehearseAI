# Client

The Rehearse frontend, built on TanStack: **TanStack Router** (file-based routing), **TanStack Query** and **TanStack Form** (forms). Styling is Tailwind v4 with shadcn/ui
components. HTTP goes through a shared axios instance. Validation uses zod, and
the little global UI state there is lives in zustand.

Use pnpm. Imports use the `#/` alias, which points to `src/` (`#/components/ui/button`).

```bash
pnpm dev              # http://localhost:3000
pnpm build
pnpm lint
pnpm format           # prettier + eslint --fix
pnpm generate-routes  # regenerate src/routeTree.gen.ts
```

## Folders

| Path               | What goes there                                                                                                                                                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/routes/`      | File-based routes. `__root.tsx` is the HTML shell. `route.tsx` files are layouts and guards. `_name/` folders are pathless layouts (`_auth`, `_landing-page`, `dashboard/_with-navbar`). `$param` folders are dynamic segments. |
| `src/components/`  | Components grouped by feature (`auth`, `billing`, `dashboard`, `home`, `interview`, `results`, `settings`). `shared/` holds app-wide pieces (navbar, footer, logo). `ui/` holds shadcn components.                              |
| `src/queries/`     | One `*.query.ts` per resource, exporting `queryOptions` / `infiniteQueryOptions` factories. These are the only place a GET request is defined.                                                                                  |
| `src/hooks/`       | `use-*.ts` hooks. Mostly one mutation per file (`useLogin`, `useDeleteInterview`), plus thin read hooks over a query (`useUser`) and behaviour hooks (`useInterviewCall`, `useDebouncedValue`).                                 |
| `src/lib/`         | Low-level setup: `axios.ts` (the API client, SSR cookie forwarding, single-flight token refresh), `speech.ts`, and `utils.ts` (`cn`).                                                                                           |
| `src/constants/`   | `api-routes.ts` (every API path), `query-keys.ts` (every query key root), and display labels.                                                                                                                                   |
| `src/validators/`  | zod schemas for forms, each exporting `fooValidator` and `FooValidatorType`.                                                                                                                                                    |
| `src/helpers/`     | Small pure helpers: `ToastHelper`, `parseError`, price formatting.                                                                                                                                                              |
| `src/stores/`      | zustand stores for global UI state only, such as the buy-interviews dialog mounted in the root. Server data never goes here.                                                                                                    |
| `src/types.ts`     | Shared API response types (`UserType`, `InterviewType`, …).                                                                                                                                                                     |
| `src/router.tsx`   | Creates the router and a per-request `QueryClient`, and wires up the SSR Query integration.                                                                                                                                     |
| `routeTree.gen.ts` | Generated. Never edit it by hand.                                                                                                                                                                                               |

## Data fetching: prefetch in the route, read with suspense

Pages don't fetch when they mount. A route's `loader` (or `beforeLoad`, for
guards) puts the data in the Query cache before the route renders. The
component then reads the same cache entry with a suspense hook. The query
options come from `src/queries/` in both places, so the loader and the
component always share one key.

```tsx
// src/queries/interviews.query.ts
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

// src/routes/dashboard/interview/$interviewId/results.tsx
export const Route = createFileRoute(
  "/dashboard/interview/$interviewId/results",
)({
  loader: async ({ context: { queryClient }, params: { interviewId } }) => {
    await queryClient.query(interviewQueryOptions(interviewId));
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { interviewId } = Route.useParams();
  const { data: interview } = useSuspenseQuery(
    interviewQueryOptions(interviewId),
  );
  // data is already defined: no loading state to handle here
}
```

The rules:

- **Define queries once** in `src/queries/` as `queryOptions` factories. Key
  them with `QUERY_KEYS` plus their parameters, and set `staleTime`, `retry`
  and `refetchInterval` there rather than at the call site.
- **Prefetch in the loader** with `context.queryClient.query(...)`, or
  `.infiniteQuery(...)` for paginated lists. Await it when the loader must
  branch on the data, for example to redirect a completed interview to its
  results or turn a 404/422 into `notFound()`.
- **Read in the component** with `useSuspenseQuery` /
  `useSuspenseInfiniteQuery`, passing the same options. Don't use plain
  `useQuery` for data the route already loaded.
- **Search-param-driven data** declares `loaderDeps`, so the loader reruns when
  the params change (see `dashboard/_with-navbar/index.tsx`). Its debounced
  search updates the URL, and the loader fetches from there.
- **Auth guard**: `dashboard/route.tsx` runs `queryClient.query(userQueryOptions)`
  in `beforeLoad` and redirects to `/login` if it fails. It sets `ssr: false`,
  because only the browser can refresh an expired access token.
- **Hover preloading** is on (`defaultPreload: "intent"` and
  `defaultPreloadStaleTime: 0` in `router.tsx`). Hovering a `<Link>` runs the
  target route's loader, and Query's own `staleTime` decides whether to refetch.
- **`useQuery` is fine** for data that isn't tied to a route: the pricing in
  the buy dialog, polling the payment status after checkout, or the navbar
  reading `useUser`.

### Mutations

Writes live in `src/hooks/use-*.ts`, one `useMutation` per hook. Return named
fields (`{ login: mutate, isPending }`). In `onSuccess`, invalidate the affected
`QUERY_KEYS` (or `removeQueries` for deleted entities) and toast with
`ToastHelper`. Pass `ToastHelper.error` as `onError`, which shows the API's
`message` through `parseError`.

## Conventions

- Add API paths to `constants/api-routes.ts` and key roots to
  `constants/query-keys.ts`. Don't write them inline.
- Forms use `@tanstack/react-form` with a validator from `src/validators/`
  (`validators: { onBlur: schema, onSubmit: schema }`).
- Add shadcn components with `pnpm dlx shadcn@latest add <name>`.
- Comments explain _why_, briefly. Match the existing density.
- This app helps candidates practise. Results are feedback for the candidate,
  never hiring recommendations, so don't add recruiter-facing features.
