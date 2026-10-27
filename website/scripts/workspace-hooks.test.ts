import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import { contract } from "../lib/patchsmith";
import { dispatchWorkspaceHook, patchsmith } from "../lib/patchsmith-server";
import { emitWorkspaceHook, type WorkspaceHookEvent } from "../lib/workspace-hooks";

const contact = {
  id: "contact-1",
  name: "Alex Chen",
  email: "alex@example.com",
  company: "Acme",
  role: "Builder",
  status: "lead" as const,
};
const events: WorkspaceHookEvent[] = [
  { name: "contacts.created", input: { contact } },
  {
    name: "deals.created",
    input: {
      deal: {
        id: "deal-1",
        title: "New deal",
        value: 100,
        stage: "qualified",
        closeDate: "2026-11-01",
        contactId: contact.id,
      },
    },
  },
  { name: "tasks.completed", input: { task: { id: "task-1", title: "Call", completed: true } } },
];

function captureHooks(t: TestContext, failFirst = false) {
  const calls: { name: string; workspaceId: string; input: unknown; appId: string }[] = [];
  for (const { name } of events) {
    const caller = patchsmith.hooks[name];
    t.mock.method(caller, "list", async (options: Parameters<typeof caller.list>[0]) => {
      assert.deepEqual(options.scopes, { workspace: { workspaceId: "workspace-a" } });
      assert.equal(options.subjectId, "service:crm-events");
      assert.ok(options.signal instanceof AbortSignal);
      // Only the installation ID is used by the dispatcher.
      return [{ id: "app-a" }, { id: "app-b" }] as Awaited<ReturnType<typeof caller.list>>;
    });
    t.mock.method(caller, "invoke", async (options: Parameters<typeof caller.invoke>[0]) => {
      calls.push({
        name,
        workspaceId: options.scopes.workspace!.workspaceId,
        input: options.input,
        appId: options.appId,
      });
      if (failFirst && options.appId === "app-a") throw new Error("private-webhook-url");
    });
  }
  return calls;
}

void test("hooks validate public CRM payloads and omit internal tenant fields", () => {
  assert.deepEqual(
    Object.keys(contract.hooks),
    events.map(({ name }) => name),
  );
  const schema = contract.hooks["contacts.created"].definition.input!;
  assert.deepEqual(schema.parse({ contact: { ...contact, tenantId: "private" } }), { contact });
  assert.throws(() => schema.parse({ contact: { id: "missing-fields" } }));
});

void test("each event targets subscribing apps within its originating workspace", async (t) => {
  const calls = captureHooks(t);
  for (const event of events) await dispatchWorkspaceHook("workspace-a", event);
  assert.deepEqual(
    calls,
    events.flatMap((event) =>
      ["app-a", "app-b"].map((appId) => ({
        name: event.name,
        input: event.input,
        workspaceId: "workspace-a",
        appId,
      })),
    ),
  );
});

void test("one failing installation does not suppress other subscribers or leak its error", async (t) => {
  const calls = captureHooks(t, true);
  const errors = t.mock.method(console, "error", () => {});
  await dispatchWorkspaceHook("workspace-a", events[0]);
  assert.equal(calls.length, 2);
  assert.deepEqual(errors.mock.calls[0].arguments, [
    "Patchsmith app hook failed:",
    "contacts.created",
    "app-a",
  ]);
});

void test("browser delivery is deferred and discovery failure cannot reject a committed mutation", async (t) => {
  const previousKey = process.env.PATCHSMITH_PROJECT_KEY;
  process.env.PATCHSMITH_PROJECT_KEY = "test-key";
  try {
    const caller = patchsmith.hooks["contacts.created"];
    const list = t.mock.method(caller, "list", async () => {
      throw new Error("private-platform-error");
    });
    const errors = t.mock.method(console, "error", () => {});
    const deferred: (() => Promise<void>)[] = [];
    const context = {
      tenant: { id: "workspace-a", name: "Acme", setupVersion: 4 },
      afterResponse: (work: () => Promise<void>) => deferred.push(work),
    };
    await emitWorkspaceHook(context, events[0]);
    assert.equal(list.mock.callCount(), 0);
    assert.equal(deferred.length, 1);
    await deferred[0]();
    assert.equal(list.mock.callCount(), 1);
    assert.deepEqual(errors.mock.calls[0].arguments, [
      "Patchsmith hook delivery failed:",
      "contacts.created",
    ]);
  } finally {
    if (previousKey === undefined) delete process.env.PATCHSMITH_PROJECT_KEY;
    else process.env.PATCHSMITH_PROJECT_KEY = previousKey;
  }
});

void test("direct tool calls await delivery; an unconfigured host makes no requests", async (t) => {
  const previousKey = process.env.PATCHSMITH_PROJECT_KEY;
  const calls = captureHooks(t);
  const context = { tenant: { id: "workspace-a", name: "Acme", setupVersion: 4 } };
  try {
    delete process.env.PATCHSMITH_PROJECT_KEY;
    await emitWorkspaceHook(context, events[0]);
    assert.equal(calls.length, 0);
    process.env.PATCHSMITH_PROJECT_KEY = "test-key";
    await emitWorkspaceHook(context, events[0]);
    assert.equal(calls.length, 2);
  } finally {
    if (previousKey === undefined) delete process.env.PATCHSMITH_PROJECT_KEY;
    else process.env.PATCHSMITH_PROJECT_KEY = previousKey;
  }
});
