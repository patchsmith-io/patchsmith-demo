import assert from "node:assert/strict";
import { test } from "node:test";
import { dehydrate, hydrate, keepPreviousData, QueryObserver } from "@tanstack/react-query";
import { appPageHref } from "../lib/app-pages";
import { makeQueryClient } from "../lib/query-client";
import { orpc } from "../lib/orpc";
import { viewsQueryOptions, type ViewsApi } from "../lib/patchsmith-queries";

const workspace = { id: "workspace-a", name: "Demo" };
const page = {
  app: { id: "doom", name: "Doom", slug: "app-installed-doom" },
  key: "doom",
  data: { difficulty: "normal" },
  metadata: { label: "Play Doom" },
};
const ready = { status: "ready" as const, data: [page], warnings: [] };

void test("pending server prefetch hydrates and deduplicates browser consumers without refetching", async () => {
  const server = makeQueryClient();
  const browser = makeQueryClient();
  let requests = 0;
  let resolve!: (value: typeof ready) => void;
  const response = new Promise<typeof ready>((done) => {
    resolve = done;
  });
  const serverApi: ViewsApi = {
    views: async (input) => {
      requests++;
      assert.equal(input.slot, "page");
      assert.ok(input.signal instanceof AbortSignal);
      assert.deepEqual(input.activeView, {
        view: "/",
        layers: [{ path: "/", status: "ready", context: { workspace, page: "/contacts" } }],
      });
      return response;
    },
  };
  const browserApi: ViewsApi = {
    views: async () => {
      throw new Error("Hydration must reuse the server request");
    },
  };
  try {
    // Real tenants include server-only fields; these must not change the key or
    // leak into the context sent to app resolvers.
    const tenant = { ...workspace, setupVersion: 10 };
    const prefetch = server.prefetchQuery(
      viewsQueryOptions(serverApi, tenant, "page", "/contacts"),
    );
    hydrate(browser, dehydrate(server));
    const options = viewsQueryOptions(browserApi, workspace, "page", "/contacts");
    const sidebar = browser.fetchQuery(options);
    const appPage = browser.fetchQuery(options);
    resolve(ready);
    await prefetch;
    assert.deepEqual(await sidebar, ready);
    assert.deepEqual(await appPage, ready);
    assert.deepEqual(await browser.fetchQuery(options), ready);
    const hydratedPages = new QueryObserver(browser, options).getCurrentResult().data;
    assert.deepEqual(hydratedPages, [page]);
    assert.equal(appPageHref(hydratedPages![0]), "/apps/app-installed-doom/doom");
    assert.equal(requests, 1);
  } finally {
    server.clear();
    browser.clear();
  }
});

void test("page queries vary by workspace and root URL; single slots reuse discovery across routes", async () => {
  const client = makeQueryClient();
  const calls: Parameters<ViewsApi["views"]>[0][] = [];
  const api: ViewsApi = {
    views: async (input) => {
      calls.push(input);
      return ready;
    },
  };
  try {
    for (const slot of ["panel", "navbar", "page"] as const) {
      await client.fetchQuery(viewsQueryOptions(api, workspace, slot, "/"));
      await client.fetchQuery(viewsQueryOptions(api, workspace, slot, "/contacts"));
      await client.fetchQuery(
        viewsQueryOptions(api, { ...workspace, id: "workspace-b" }, slot, "/"),
      );
    }
    assert.equal(calls.filter((call) => call.slot === "page").length, 3);
    assert.equal(calls.filter((call) => call.slot === "panel").length, 2);
    assert.equal(calls.filter((call) => call.slot === "navbar").length, 2);
    assert.ok(
      calls.filter((call) => call.slot !== "page").every((call) => call.activeView === null),
    );
  } finally {
    client.clear();
  }
});

void test("navigation keeps app links visible while resolving the destination URL", async () => {
  const client = makeQueryClient();
  const destination = Promise.withResolvers<typeof ready>();
  const destinationPages = {
    ...ready,
    data: [{ ...page, metadata: { label: "Contacts report" } }],
  };
  const api: ViewsApi = {
    views: async ({ activeView }) => {
      const context = activeView?.layers[0]?.context as { page: string };
      return context.page === "/" ? ready : destination.promise;
    },
  };
  const initial = viewsQueryOptions(api, workspace, "page", "/");
  const next = viewsQueryOptions(api, workspace, "page", "/contacts");
  let unsubscribe: (() => void) | undefined;
  try {
    await client.prefetchQuery(initial);
    const observer = new QueryObserver(client, { ...initial, placeholderData: keepPreviousData });
    unsubscribe = observer.subscribe(() => {});
    observer.setOptions({ ...next, placeholderData: keepPreviousData });
    const navigating = observer.getCurrentResult();
    assert.equal(navigating.isFetching, true);
    assert.equal(navigating.isPlaceholderData, true);
    assert.equal(navigating.isPending, false);
    assert.deepEqual(navigating.data, [page]);
    // The page renderer must not treat the previous route's placeholder as the
    // destination's actual instance data.
    assert.equal(client.getQueryData(next.queryKey), undefined);
    destination.resolve(destinationPages);
    await client.fetchQuery(next);
    assert.deepEqual(observer.getCurrentResult().data, destinationPages.data);
    assert.equal(observer.getCurrentResult().isPlaceholderData, false);
  } finally {
    destination.resolve(destinationPages);
    unsubscribe?.();
    client.clear();
  }
});

void test("CRM mutations refresh all active app slots along with CRM data", async () => {
  const client = makeQueryClient();
  const calls: string[] = [];
  const api: ViewsApi = {
    views: async ({ slot }) => {
      calls.push(slot);
      return slot === "page" ? ready : { ...ready, data: [{ app: page.app }] };
    },
  };
  const unsubscribes: (() => void)[] = [];
  try {
    for (const slot of ["page", "panel", "navbar"] as const) {
      const option = viewsQueryOptions(api, workspace, slot, "/");
      await client.fetchQuery(option);
      unsubscribes.push(new QueryObserver(client, option).subscribe(() => {}));
    }
    const crmOptions = {
      queryKey: [...orpc.key(), "test"],
      queryFn: async () => {
        calls.push("crm");
        return ready;
      },
    };
    await client.fetchQuery(crmOptions);
    unsubscribes.push(new QueryObserver(client, crmOptions).subscribe(() => {}));
    calls.length = 0;
    const mutation = client.getMutationCache().build(client, { mutationFn: async () => "saved" });
    await mutation.execute(undefined);
    assert.deepEqual(calls.toSorted(), ["crm", "navbar", "page", "panel"]);
  } finally {
    for (const unsubscribe of unsubscribes) unsubscribe();
    client.clear();
  }
});

void test("CRM mutations wait for CRM refresh without waiting for app discovery", async () => {
  const client = makeQueryClient();
  const appResponse = Promise.withResolvers<typeof ready>();
  const crmResponse = Promise.withResolvers<typeof ready>();
  const appStarted = Promise.withResolvers<void>();
  const crmStarted = Promise.withResolvers<void>();
  let refreshing = false;
  const api: ViewsApi = {
    views: async () => {
      if (!refreshing) return ready;
      appStarted.resolve();
      return appResponse.promise;
    },
  };
  const appOptions = viewsQueryOptions(api, workspace, "page", "/");
  const crmOptions = {
    queryKey: [...orpc.key(), "test"],
    queryFn: async () => {
      if (!refreshing) return ready;
      crmStarted.resolve();
      return crmResponse.promise;
    },
  };
  const unsubscribes: (() => void)[] = [];
  try {
    await client.fetchQuery(appOptions);
    await client.fetchQuery(crmOptions);
    unsubscribes.push(new QueryObserver(client, appOptions).subscribe(() => {}));
    unsubscribes.push(new QueryObserver(client, crmOptions).subscribe(() => {}));
    refreshing = true;
    const mutation = client.getMutationCache().build(client, { mutationFn: async () => "saved" });
    const pending = mutation.execute(undefined);
    await Promise.all([appStarted.promise, crmStarted.promise]);
    assert.equal(mutation.state.status, "pending");
    crmResponse.resolve(ready);
    await pending;
    assert.equal(mutation.state.status, "success");
    assert.equal(client.getQueryState(appOptions.queryKey)?.fetchStatus, "fetching");
    appResponse.resolve(ready);
    await client.fetchQuery(appOptions);
  } finally {
    appResponse.resolve(ready);
    crmResponse.resolve(ready);
    for (const unsubscribe of unsubscribes) unsubscribe();
    client.clear();
  }
});

void test("discovery errors retain cached pages, support retries and preserve partial-response warnings", async () => {
  const client = makeQueryClient();
  let fail = true;
  const warnings = [
    {
      appId: "other",
      code: "INSTANCE_RESOLUTION_TIMEOUT" as const,
      message: "Timed out",
      path: "/",
    },
  ];
  const api: ViewsApi = {
    views: async () => {
      if (fail) throw new Error("Unavailable");
      return { ...ready, warnings };
    },
  };
  try {
    const options = viewsQueryOptions(api, workspace, "page", "/");
    await assert.rejects(client.fetchQuery(options), /Unavailable/);
    const observer = new QueryObserver(client, options);
    assert.equal(observer.getCurrentResult().isLoadingError, true);
    assert.equal(observer.getCurrentResult().data, undefined);
    fail = false;
    const result = await observer.refetch();
    assert.equal(result.isSuccess, true);
    assert.deepEqual(result.data, [page]);
    assert.deepEqual(client.getQueryData(options.queryKey)?.warnings, warnings);
    fail = true;
    const backgroundError = await observer.refetch();
    assert.equal(backgroundError.isRefetchError, true);
    assert.deepEqual(backgroundError.data, [page]);
  } finally {
    client.clear();
  }
});

void test("cancelling a view query aborts its direct API request", async () => {
  const client = makeQueryClient();
  let requestSignal: AbortSignal | undefined;
  const api: ViewsApi = {
    views: ({ signal }) => {
      requestSignal = signal;
      return new Promise((_resolve, reject) => {
        signal?.addEventListener("abort", () => reject(signal.reason), { once: true });
      });
    },
  };
  try {
    const options = viewsQueryOptions(api, workspace, "page", "/");
    const pending = client.prefetchQuery(options);
    await client.cancelQueries({ queryKey: options.queryKey });
    await pending;
    assert.equal(requestSignal?.aborted, true);
  } finally {
    client.clear();
  }
});
