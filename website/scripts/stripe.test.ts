import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppSlotButton } from "../components/app/app-slot-button";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { drizzle } from "drizzle-orm/node-sqlite";
import { defineContract } from "patchsmith";
import { createFileServer, createServer, type Identity } from "patchsmith/server";
import { database } from "../../apps/stripe/db";
import billingRouter from "../../apps/stripe/functions/billing.router";
import { seedBilling, summarize, type Contact, type Customer } from "../../apps/stripe/lib/billing";
import { installStripe } from "../lib/install-stripe";
import { appPageHref, findAppPage } from "../lib/app-pages";
import { contract } from "../lib/patchsmith";

const identity: Identity = {
  subjectId: "visitor",
  appId: "stripe-source",
  installationId: "stripe-installation",
  projectId: "demo",
  deploymentId: "deployment",
  expiresAt: Date.now() + 60000,
  toolUrl: "https://demo.patchsmith.io/api/patchsmith",
  scope: { name: "workspace", value: { workspaceId: "test-workspace" } },
};
const contact = (id: string): Contact => ({
  id,
  name: `Contact ${id}`,
  email: `${id}@example.com`,
  company: "Acme",
});
const migrations = new URL("../../apps/stripe/db/migrations/", import.meta.url);
const migration = readFileSync(
  new URL(`${readdirSync(migrations)[0]}/migration.sql`, migrations),
  "utf8",
);

function openDatabase(path = ":memory:", migrate = true) {
  const client = new DatabaseSync(path);
  if (migrate) client.exec(migration);
  // The host and SDK pin different Drizzle prereleases. This fixture adapts the
  // real synchronous SQLite driver to the SDK capability and executes its SQL.
  const db = drizzle({ client, relations: database.relations }) as unknown as Parameters<
    typeof billingRouter.reconcile.handler
  >[0]["db"];
  return {
    close: () => client.close(),
    sync: (contacts: Contact[]) =>
      billingRouter.reconcile.handler({ args: { contacts }, db, identity }),
    list: () => billingRouter.list.handler({ args: {}, db, identity }),
    syncFromHost: async (contacts: Contact[]) => {
      const app = createFileServer([
        {
          filename: "functions/billing.router.ts",
          path: ["billing"],
          functions: billingRouter,
        },
      ]);
      const declared = billingRouter.sync.functions.billing.reconcile;
      assert.ok("reconcile" in app.functions.billing);
      assert.equal(
        app.functions.billing.reconcile,
        declared,
        "Action dependencies must use their registered file-router path",
      );
      type Context = Parameters<typeof billingRouter.sync.handler>[0];
      return billingRouter.sync.handler({
        args: {},
        identity,
        scope: identity.scope,
        signal: new AbortController().signal,
        requestId: crypto.randomUUID(),
        queries: { billing: {} },
        actions: { billing: {} },
        // This scoped tool fixture supplies only the contact lookup used by sync.
        tools: {
          contacts: { list: async () => ({ contacts, count: contacts.length }) },
        } as unknown as Context["tools"],
        mutations: {
          billing: { reconcile: async (args) => declared.handler({ args, db, identity }) },
        },
      });
    },
  };
}

void test("billing sync dispatches its registered action dependency and saves host-scoped contacts", async () => {
  const store = openDatabase();
  try {
    assert.deepEqual(await store.syncFromHost([contact("host-contact")]), { count: 1 });
    const saved = store.list();
    assert.deepEqual(
      saved.map(({ id }) => id),
      ["host-contact"],
    );
    await store.syncFromHost([contact("host-contact")]);
    assert.deepEqual(store.list(), saved);
  } finally {
    store.close();
  }
});

void test("billing is seeded once, survives database reopen, and preserves history when names change", () => {
  const directory = mkdtempSync(join(tmpdir(), "forma-stripe-"));
  const path = join(directory, "billing.sqlite");
  let store = openDatabase(path);
  try {
    store.sync([contact("a"), contact("b")]);
    const original = store.list();
    store.sync([contact("a"), contact("b")]);
    assert.deepEqual(store.list(), original);
    store.close();
    store = openDatabase(path, false);
    assert.deepEqual(store.list(), original);
    store.sync([
      { ...contact("a"), name: "Renamed", email: "new@example.com" },
      contact("b"),
      contact("c"),
    ]);
    assert.equal(store.list().length, 3);
    const updated = store.list().find(({ id }) => id === "a")!;
    assert.equal(updated.name, "Renamed");
    assert.equal(updated.email, "new@example.com");
    assert.deepEqual(updated.billing, original.find(({ id }) => id === "a")!.billing);
  } finally {
    store.close();
    rmSync(directory, { recursive: true });
  }
});

void test("separate installation databases isolate contacts and removed contacts leave analytics", () => {
  const a = openDatabase(),
    b = openDatabase();
  try {
    a.sync([contact("a"), contact("b")]);
    b.sync([contact("other")]);
    a.sync([contact("b")]);
    assert.deepEqual(
      a.list().map(({ id }) => id),
      ["b"],
    );
    assert.deepEqual(
      b.list().map(({ id }) => id),
      ["other"],
    );
    a.sync([]);
    assert.deepEqual(a.list(), []);
    assert.equal(summarize(a.list()).mrr, 0);
  } finally {
    a.close();
    b.close();
  }
});

void test("analytics reconciles paid, open, void, trial and canceled billing in integer cents", () => {
  const statuses = ["active", "past_due", "trialing", "canceled"] as const;
  const customers: Customer[] = statuses.map((status) => ({
    ...contact(status),
    billing: {
      ...seedBilling(status, new Date("2026-10-24T00:00:00Z")),
      status,
      monthlyAmount: 4900,
      invoices:
        status === "trialing"
          ? []
          : [
              { id: `${status}-paid`, date: "2026-09-12T00:00:00Z", amount: 4900, status: "paid" },
              {
                id: `${status}-latest`,
                date: "2026-10-12T00:00:00Z",
                amount: 4900,
                status: status === "canceled" ? "void" : status === "past_due" ? "open" : "paid",
              },
            ],
    },
  }));
  const result = summarize(customers);
  assert.equal(result.revenue, 19600);
  assert.equal(result.mrr, 9800);
  assert.equal(result.outstanding, 4900);
  assert.equal(result.active, 1);
  assert.equal(result.trials, 1);
  assert.equal(result.pastDue, 1);
  assert.equal(
    result.months.reduce((sum, { amount }) => sum + amount, 0),
    result.revenue,
  );
});

void test("Stripe installation uses the signed workspace scope and reports missing publication", async () => {
  const requests: unknown[] = [];
  const server = createServer({
    contract: defineContract({ scopes: contract.scopes, components: {} }),
    baseUrl: "http://localhost:3000/api/patchsmith",
    projectKey: "test-key",
    $internal: {
      platformFetch: async (url, init) => {
        requests.push(await new Request(url, init).json());
        return Response.json({ id: "stripe-installation" });
      },
    },
  });
  assert.equal(
    await installStripe("test-workspace", {
      appId: "stripe-source",
      installApp: server.experimental.installApp,
    }),
    "stripe-installation",
  );
  assert.deepEqual(requests, [{ app: { shortId: "stripe-source" }, scope: identity.scope }]);
  await assert.rejects(installStripe("test-workspace", { appId: "" }), /Publish apps\/stripe/);
});

void test("Stripe analytics has a readable page URL and Button accepts safe external links", () => {
  const page = {
    app: { id: "stripe-installation", name: "Stripe", slug: "stripe" },
    key: "overview",
    metadata: { label: "Stripe analytics" },
    data: {},
  };
  assert.equal(appPageHref(page), "/apps/stripe/overview");
  assert.equal(findAppPage([page], { appSlug: "stripe", instance: "overview" }), page);
  const fields = contract.components.Button.fields;
  assert.equal(fields.safeParse({ label: "Run action" }).success, true);
  for (const href of [
    "https://dashboard.stripe.com/test/forma-demo",
    "https://example.com",
    "http://localhost:3000",
  ]) {
    assert.equal(
      fields.safeParse({ label: "Open", href, variant: "outline", size: "sm" }).success,
      true,
    );
  }
  for (const href of [
    "javascript:alert(1)",
    "data:text/html,hello",
    "//example.com",
    "https://",
    "",
  ]) {
    assert.equal(fields.safeParse({ label: "Stripe", href }).success, false);
  }
  assert.equal(billingRouter.reconcile.visibility, "internal");
});

void test("app links use the shared button's SVG icon and preserve disabled link behavior", () => {
  const props = {
    label: "View on Stripe",
    href: "https://dashboard.stripe.com/test/forma-demo",
    variant: "outline" as const,
  };
  const html = renderToStaticMarkup(createElement(AppSlotButton, props));
  assert.match(html, /<a[^>]+href="https:\/\/dashboard.stripe.com\/test\/forma-demo"/);
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.match(html, /<svg[^>]+data-icon="inline-end"[^>]+aria-hidden="true"/);
  assert.doesNotMatch(html, /↗/);

  const disabled = renderToStaticMarkup(createElement(AppSlotButton, { ...props, disabled: true }));
  assert.doesNotMatch(disabled, /href=/);
  assert.match(disabled, /aria-disabled="true"/);
  assert.match(disabled, /tabindex="-1"/);

  const action = renderToStaticMarkup(createElement(AppSlotButton, { label: "Open contact" }));
  assert.match(action, /<button/);
  assert.doesNotMatch(action, /<svg|<a\s/);
});

void test("app tabs validate bounded, unique options across the catalog boundary", () => {
  const fields = contract.components.Tabs.fields;
  const props = {
    label: "Billing activity",
    value: "invoices",
    options: [
      { label: "Recent invoices", value: "invoices" },
      { label: "Subscriptions", value: "subscriptions" },
    ],
  };
  assert.equal(fields.safeParse(props).success, true);
  assert.equal(fields.safeParse({ ...props, options: [] }).success, false);
  assert.equal(
    fields.safeParse({ ...props, options: [props.options[0], props.options[0]] }).success,
    false,
  );
  assert.equal(
    fields.safeParse({
      ...props,
      options: Array.from({ length: 8 }, (_, i) => ({ label: String(i), value: String(i) })),
    }).success,
    false,
  );
});
