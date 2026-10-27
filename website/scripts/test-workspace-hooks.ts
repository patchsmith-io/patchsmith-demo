import "./test-env";
import assert from "node:assert/strict";
import { mock } from "node:test";
import { createRouterClient, ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";
import { auth } from "../lib/auth";
import { db, pool } from "../lib/drizzle";
import { contacts, deals, tasks, tenants, user } from "../lib/schema";
import { CURRENT_SETUP_VERSION } from "../lib/provision";
import { patchsmith } from "../lib/patchsmith-server";
import { router } from "../routers";
import { verifiedWorkspaceContext } from "../routers/context";
import { handleRpcRequest } from "../routers/handler";
import type { WorkspaceHookEvent } from "../lib/workspace-hooks";

async function main() {
  const previousKey = process.env.PATCHSMITH_PROJECT_KEY;
  const users: string[] = [];
  const delivered: { name: string; input: unknown; workspaceId: string; committed: boolean }[] = [];
  let fail = false;
  process.env.PATCHSMITH_PROJECT_KEY = "test-key-no-platform-requests";
  mock.method(console, "error", () => {});
  for (const name of Object.keys(patchsmith.hooks) as WorkspaceHookEvent["name"][]) {
    const caller = patchsmith.hooks[name];
    mock.method(
      caller,
      "list",
      async () => [{ id: "test-installation" }] as Awaited<ReturnType<typeof caller.list>>,
    );
    mock.method(caller, "invoke", async (options: Parameters<typeof caller.invoke>[0]) => {
      const input = options.input;
      const table = "contact" in input ? contacts : "deal" in input ? deals : tasks;
      const record = "contact" in input ? input.contact : "deal" in input ? input.deal : input.task;
      const rows = await db.select({ id: table.id }).from(table).where(eq(table.id, record.id));
      delivered.push({
        name,
        input,
        workspaceId: options.scopes.workspace!.workspaceId,
        committed: rows.length === 1,
      });
      if (fail) throw new Error("App webhook unavailable");
    });
  }
  try {
    const response = await auth.api.signInAnonymous({ asResponse: true });
    assert.equal(response.status, 200);
    const payload = await response.json();
    users.push(payload.user.id);
    const workspaceId = crypto.randomUUID();
    await db.insert(tenants).values({
      id: workspaceId,
      userId: payload.user.id,
      setupVersion: CURRENT_SETUP_VERSION,
    });
    const client = createRouterClient(router, { context: verifiedWorkspaceContext(workspaceId) });
    const fields = {
      name: "Hook fixture",
      email: "hooks@example.com",
      company: "Acme",
      role: "Builder",
      status: "lead" as const,
    };
    const saved = await client.contacts.create(fields);
    assert.deepEqual(delivered, [
      {
        name: "contacts.created",
        input: { contact: saved.contact },
        workspaceId,
        committed: true,
      },
    ]);

    const deal = await client.deals.create({ title: "Hook deal", value: 100 });
    assert.deepEqual(delivered.at(-1)?.input, { deal: deal.deal });
    assert.equal(delivered.at(-1)?.name, "deals.created");
    const task = await client.tasks.create({ title: "Hook follow-up", dueDate: "2026-11-01" });
    assert.equal(delivered.length, 2, "Task creation is not task completion");
    await Promise.all(
      Array.from({ length: 4 }, () =>
        client.tasks.setCompleted({ id: task.task.id, completed: true }),
      ),
    );
    assert.equal(delivered.length, 3, "Concurrent completion requests emit exactly once");
    assert.equal(delivered.at(-1)?.name, "tasks.completed");
    await client.tasks.setCompleted({ id: task.task.id, completed: false });
    assert.equal(delivered.length, 3, "Reopening does not emit completion");
    await client.tasks.setCompleted({ id: task.task.id, completed: true });
    assert.equal(delivered.length, 4, "Completing a reopened task is a new event");

    await assert.rejects(client.contacts.create({ ...fields, name: "" }), ORPCError);
    await assert.rejects(
      client.tasks.setCompleted({ id: "missing-task", completed: true }),
      ORPCError,
    );
    assert.equal(delivered.length, 4, "Rejected mutations emit nothing");

    // Use the actual HTTP handler to verify response-lifetime scheduling.
    const cookie = response.headers
      .getSetCookie()
      .map((value) => value.split(";")[0])
      .join("; ");
    const deferred: (() => Promise<void>)[] = [];
    const http = await handleRpcRequest(
      new Request("http://localhost:3000/rpc/contacts/create", {
        method: "POST",
        headers: { origin: "http://localhost:3000", cookie, "content-type": "application/json" },
        body: JSON.stringify({ json: { ...fields, name: "HTTP hook fixture" } }),
      }),
      (work) => deferred.push(work),
    );
    assert.equal(http.status, 200, await http.clone().text());
    assert.equal(deferred.length, 1);
    assert.equal(delivered.length, 4);
    await deferred[0]();
    assert.equal(delivered.length, 5);

    fail = true;
    const persisted = await client.contacts.create({
      ...fields,
      name: "Saved despite hook failure",
    });
    assert.equal(
      (await client.contacts.get({ id: persisted.contact.id })).contact.name,
      "Saved despite hook failure",
    );
    assert.equal(delivered.length, 6);
    assert.ok(delivered.every((event) => event.committed && event.workspaceId === workspaceId));

    await db.insert(contacts).values(
      Array.from({ length: 47 }, (_, index) => ({
        ...fields,
        id: crypto.randomUUID(),
        tenantId: workspaceId,
        name: `Existing ${index}`,
      })),
    );
    await assert.rejects(client.contacts.create(fields), ORPCError);
    assert.equal(delivered.length, 6, "A transaction rejected at the record limit emits nothing");
    console.log(
      "Workspace hooks: committed writes, HTTP deferral, failures, and concurrent completion verified.",
    );
  } finally {
    mock.restoreAll();
    if (previousKey === undefined) delete process.env.PATCHSMITH_PROJECT_KEY;
    else process.env.PATCHSMITH_PROJECT_KEY = previousKey;
    for (const id of users) await db.delete(user).where(eq(user.id, id));
    await pool.end();
  }
}

void main();
