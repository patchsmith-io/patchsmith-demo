import "./test-env";
import assert from "node:assert/strict";
import { test } from "node:test";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { call } from "@orpc/server";
import { count, eq } from "drizzle-orm";
import { auth } from "../lib/auth";
import { db, pool } from "../lib/drizzle";
import { contacts, tenants, user } from "../lib/schema";
import type { router } from "../routers";
import type { RouterClient } from "@orpc/server";

void test("contact-created hooks retain the creator across browser, agent and app tools", async (t) => {
  const originalFetch = globalThis.fetch;
  const users: string[] = [];
  const keyPair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, [
    "sign",
    "verify",
  ]);
  const publicKey = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const discovery: unknown[] = [];
  let discoveryFails = false;
  let supportsHook = true;
  // Use the real SDK discovery and tool credential verification, with a local platform fixture.
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init);
    const path = new URL(request.url).pathname;
    if (path.endsWith("/runtime/keys"))
      return Response.json({ keys: [{ ...publicKey, kid: "test-key" }] });
    if (path.endsWith("/apps/lookup"))
      return Response.json({
        id: "installation",
        projectId: "project",
        currentDeployment: { id: "deployment" },
      });
    assert.ok(path.endsWith("/apps/list"), `Unexpected platform call: ${path}`);
    discovery.push((await request.json()).scopes);
    if (discoveryFails) return Response.json({ message: "Unavailable" }, { status: 503 });
    return Response.json({
      items: ["failing-app", "working-app", "unsupported-app"].map((id) => ({
        id,
        currentDeployment: {
          hooks: supportsHook && id !== "unsupported-app" ? ["contactCreated"] : [],
        },
      })),
      pagination: { hasMore: false },
    });
  };
  try {
    const { patchsmith } = await import("../lib/patchsmith-server");
    const { createContact } = await import("../routers/contacts");
    const { handleRpcRequest } = await import("../routers/handler");
    const { verifiedWorkspaceContext } = await import("../routers/context");
    const { createCrmTools } = await import("../lib/agents/crm-tools");
    const { CURRENT_SETUP_VERSION } = await import("../lib/provision");
    const fixtures = [];
    for (let index = 0; index < 2; index++) {
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
      const cookie = response.headers
        .getSetCookie()
        .map((value) => value.split(";")[0])
        .join("; ");
      fixtures.push({ subjectId: payload.user.id as string, workspaceId, cookie });
    }
    const [first, second] = fixtures;
    const invocations: {
      options: Parameters<typeof patchsmith.hooks.contactCreated.invoke>[0];
      savedWorkspaceId: string | undefined;
    }[] = [];
    t.mock.method(console, "error", () => {});
    t.mock.method(
      patchsmith.hooks.contactCreated,
      "invoke",
      async (options: Parameters<typeof patchsmith.hooks.contactCreated.invoke>[0]) => {
        const [saved] = await db
          .select()
          .from(contacts)
          .where(eq(contacts.id, options.input.contact.id));
        invocations.push({ options, savedWorkspaceId: saved?.tenantId });
        if (options.appId === "failing-app") throw new Error("App unavailable");
      },
    );
    const input = {
      name: "  New contact  ",
      email: "new@example.com",
      company: "Forma",
      role: "Builder",
      status: "lead" as const,
    };
    const origin = "http://localhost:3000";
    const browser = createORPCClient<RouterClient<typeof router>>(
      new RPCLink({
        origin,
        url: "/rpc",
        headers: { origin, cookie: first.cookie },
        fetch: (url, init) => handleRpcRequest(new Request(url, init)),
      }),
    );
    const created = await browser.contacts.create(input);
    assert.deepEqual(discovery.at(-1), [
      { name: "workspace", value: { workspaceId: first.workspaceId } },
    ]);
    const assertDelivery = (
      start: number,
      subjectId: string,
      workspaceId: string,
      contact: typeof created.contact,
    ) => {
      assert.deepEqual(
        invocations.slice(start),
        ["failing-app", "working-app"].map((appId) => ({
          options: { subjectId, scopes: { workspace: { workspaceId } }, appId, input: { contact } },
          savedWorkspaceId: workspaceId,
        })),
      );
      assert.equal(contact.name, "New contact");
    };
    assertDelivery(0, first.subjectId, first.workspaceId, created.contact);

    const tools = createCrmTools(second.workspaceId, second.subjectId);
    await tools.createContact.execute!(input, { toolCallId: "create", messages: [], context: {} });
    assertDelivery(2, second.subjectId, second.workspaceId, invocations[2].options.input.contact);

    // The signed app subject can differ from the workspace owner; never substitute that owner.
    const now = Math.floor(Date.now() / 1000);
    const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
    const unsigned = `${encode({ alg: "ES256", typ: "JWT", kid: "test-key" })}.${encode({
      appId: "installation",
      appShortId: "app",
      installationId: "installation",
      projectId: "project",
      projectShortId: "project",
      deploymentId: "deployment",
      aud: "patchsmith-app",
      iss: "https://patchsmith.io/api/platform",
      sub: "installation",
      subjectId: second.subjectId,
      scope: { name: "workspace", value: { workspaceId: first.workspaceId } },
      iat: now,
      exp: now + 300,
      toolUrl: `${origin}/api/patchsmith/tools/execute`,
    })}`;
    const signature = await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      keyPair.privateKey,
      new TextEncoder().encode(unsigned),
    );
    const appResponse = await patchsmith.handler(
      new Request(`${origin}/api/patchsmith/tools/execute`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${unsigned}.${Buffer.from(signature).toString("base64url")}`,
        },
        body: JSON.stringify({ path: "contacts.create", requestId: crypto.randomUUID(), input }),
      }),
      { authenticate: async () => null },
    );
    assert.equal(appResponse.status, 200, await appResponse.clone().text());
    assertDelivery(
      4,
      second.subjectId,
      first.workspaceId,
      (await appResponse.json()).output.contact,
    );

    const beforeRejected = discovery.length;
    await assert.rejects(
      call(createContact, input, { context: verifiedWorkspaceContext(first.workspaceId) }),
      { code: "UNAUTHORIZED" },
    );
    await assert.rejects(browser.contacts.create({ ...input, name: "" }), { code: "BAD_REQUEST" });
    assert.equal(discovery.length, beforeRejected);

    supportsHook = false;
    await browser.contacts.create(input);
    assert.equal(invocations.length, 6, "Apps without the hook are skipped");
    discoveryFails = true;
    assert.equal((await browser.contacts.create(input)).success, true);
    assert.equal(invocations.length, 6, "Discovery failure does not fail contact creation");
    discoveryFails = false;
    const [{ total }] = await db
      .select({ total: count() })
      .from(contacts)
      .where(eq(contacts.tenantId, first.workspaceId));
    await db.insert(contacts).values(
      Array.from({ length: 50 - total }, () => ({
        ...input,
        id: crypto.randomUUID(),
        tenantId: first.workspaceId,
      })),
    );
    const beforeFull = discovery.length;
    await assert.rejects(browser.contacts.create(input), { code: "CONFLICT" });
    assert.equal(discovery.length, beforeFull, "A rejected transaction must not emit a hook");
  } finally {
    globalThis.fetch = originalFetch;
    for (const id of users) await db.delete(user).where(eq(user.id, id));
    await pool.end();
  }
});
