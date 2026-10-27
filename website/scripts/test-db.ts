import "./test-env";
import assert from "node:assert/strict";
import { mock } from "node:test";
import { and, asc, count, desc, eq } from "drizzle-orm";
import { auth } from "../lib/auth";
import { db, pool } from "../lib/drizzle";
import { activities, contacts, deals, tasks, tenants, user } from "../lib/schema";
import { provisionForUser } from "./test-provision";
import { CURRENT_SETUP_VERSION, provisionForUser as provisionDemo } from "../lib/provision";
import { createRouterClient, ORPCError } from "@orpc/server";
import { router } from "../routers";
import { verifiedWorkspaceContext } from "../routers/context";
import { checkContact, RECORD_LIMIT } from "../routers/shared";
import { patchsmith } from "../lib/patchsmith-server";

async function main() {
  const users: string[] = [];
  const hookDiscovery = mock.method(patchsmith.hooks.contactCreated, "list", async () => []);
  try {
    const response = await auth.api.signInAnonymous({ asResponse: true });
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.user.isAnonymous, true);
    users.push(payload.user.id);
    const cookies = response.headers.get("set-cookie");
    assert.ok(cookies?.includes("better-auth.session_token"));
    const session = await auth.api.getSession({ headers: new Headers({ cookie: cookies! }) });
    assert.equal(session?.user.id, payload.user.id);
    const baseTenant = await provisionDemo(payload.user.id, { complete: false });
    assert.equal(baseTenant.setupVersion, 1);
    await assert.rejects(
      provisionDemo(payload.user.id, {
        install: async () => {
          throw new Error("Install unavailable");
        },
      }),
      /Install unavailable/,
    );
    const [incomplete] = await db.select().from(tenants).where(eq(tenants.id, baseTenant.id));
    assert.equal(incomplete.setupVersion, 1, "A failed install must remain retryable");
    let installs = 0;
    let doomInstalls = 0;
    let stripeInstalls = 0;
    const install = async () => {
      installs++;
    };
    const installDoom = async () => {
      doomInstalls++;
    };
    const installStripe = async () => {
      stripeInstalls++;
    };
    await assert.rejects(
      provisionDemo(payload.user.id, {
        install,
        installDoom: async () => {
          throw new Error("Doom unavailable");
        },
      }),
      /Doom unavailable/,
    );
    const [messagesReady] = await db.select().from(tenants).where(eq(tenants.id, baseTenant.id));
    assert.equal(messagesReady.setupVersion, 2, "A failed Doom install must preserve Messages");
    await assert.rejects(
      provisionDemo(payload.user.id, {
        install,
        installDoom,
        installStripe: async () => {
          throw new Error("Stripe unavailable");
        },
      }),
      /Stripe unavailable/,
    );
    const [doomReady] = await db.select().from(tenants).where(eq(tenants.id, baseTenant.id));
    assert.equal(doomReady.setupVersion, 3, "A failed Stripe install must preserve Doom");
    const provisioned = await Promise.all(
      Array.from({ length: 4 }, () =>
        provisionDemo(payload.user.id, { install, installDoom, installStripe }),
      ),
    );
    await provisionDemo(payload.user.id, { install, installDoom, installStripe });
    assert.equal(installs, 1, "Concurrent setup and retries must install only once");
    assert.equal(doomInstalls, 1, "Concurrent setup must install Doom only once");
    assert.equal(stripeInstalls, 1, "Concurrent setup must install Stripe only once");
    assert.equal(
      new Set(provisioned.map((t) => t.id)).size,
      1,
      "Concurrent provisioning must create one tenant",
    );
    const tenant = provisioned[0];
    const client = createRouterClient(router, {
      context: verifiedWorkspaceContext(tenant.id, payload.user.id),
    });
    assert.equal(tenant.setupVersion, CURRENT_SETUP_VERSION);
    for (const [table, expected] of [
      [contacts, 30],
      [deals, 18],
      [tasks, 12],
      [activities, 12],
    ] as const) {
      const [row] = await db
        .select({ total: count() })
        .from(table)
        .where(eq(table.tenantId, tenant.id));
      assert.equal(row.total, expected, "Seed counts must remain stable after concurrent retries");
    }
    const second = await auth.api.signInAnonymous({ asResponse: true });
    const secondPayload = await second.json();
    users.push(secondPayload.user.id);
    const secondTenant = await provisionForUser(secondPayload.user.id);
    const stageDeals = (stage: typeof deals.$inferSelect.stage) =>
      db
        .select()
        .from(deals)
        .where(and(eq(deals.tenantId, tenant.id), eq(deals.stage, stage)))
        .orderBy(asc(deals.position), desc(deals.createdAt), asc(deals.id));
    const [first, middle, last] = await stageDeals("qualified");
    const beforeSelfMove = await stageDeals("qualified");
    const beforeSelfMoveActivity = await db
      .select()
      .from(activities)
      .where(eq(activities.tenantId, tenant.id))
      .orderBy(asc(activities.id));
    const selfMove = await client.deals.move({
      id: first.id,
      stage: "qualified",
      targetId: first.id,
    });
    assert.equal(
      selfMove.stage,
      "qualified",
      "Same-stage self-target moves remain successful no-ops",
    );
    await assert.rejects(
      client.deals.move({ id: first.id, stage: "proposal", targetId: first.id }),
      (error: unknown) => error instanceof ORPCError && error.code === "CONFLICT",
      "Cross-stage self-target moves must reject rather than report a stage change",
    );
    assert.deepEqual(await stageDeals("qualified"), beforeSelfMove);
    assert.deepEqual(
      await db
        .select()
        .from(activities)
        .where(eq(activities.tenantId, tenant.id))
        .orderBy(asc(activities.id)),
      beforeSelfMoveActivity,
      "Self-target moves must not log activity",
    );
    await client.deals.move({
      id: first.id,
      stage: "qualified",
      targetId: last.id,
      placement: "after",
    });
    assert.deepEqual(
      (await stageDeals("qualified")).map((deal) => deal.id),
      [middle.id, last.id, first.id],
      "Sorting downward must persist",
    );
    await client.deals.move({
      id: first.id,
      stage: "qualified",
      targetId: middle.id,
      placement: "before",
    });
    assert.deepEqual(
      (await stageDeals("qualified")).map((deal) => deal.id),
      [first.id, middle.id, last.id],
      "Sorting upward must persist",
    );
    const proposal = await stageDeals("proposal");
    await client.deals.move({ id: first.id, stage: "proposal", targetId: proposal[0].id });
    const moved = await stageDeals("proposal");
    assert.deepEqual(
      moved.map((deal) => deal.id),
      [first.id, ...proposal.map((deal) => deal.id)],
      "Cross-stage drops must honor their insertion point",
    );
    assert.equal(moved[0].title, first.title, "Moving must preserve deal details");
    assert.equal(moved[0].value, first.value);
    await client.deals.move({ id: first.id, stage: "qualified" });
    assert.deepEqual(
      (await stageDeals("qualified")).map((deal) => deal.id),
      [middle.id, last.id, first.id],
      "Dropping on column space must append",
    );
    const [foreignDeal] = await db.select().from(deals).where(eq(deals.tenantId, secondTenant.id));
    await assert.rejects(
      client.deals.move({ id: foreignDeal.id, stage: "qualified" }),
      /Deal not found/,
    );
    await assert.rejects(
      client.deals.move({ id: first.id, stage: "proposal", targetId: foreignDeal.id }),
      /destination deal/,
    );
    assert.deepEqual(
      (await stageDeals("qualified")).map((deal) => deal.id),
      [middle.id, last.id, first.id],
      "Rejected moves must leave the board unchanged",
    );
    const [foreignContact] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.tenantId, secondTenant.id));
    const inaccessible = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.id, foreignContact.id), eq(contacts.tenantId, tenant.id)));
    assert.equal(
      inaccessible.length,
      0,
      "Tenant-scoped lookup must not expose another tenant's contact",
    );
    const input = {
      name: "Database Test",
      email: "test@example.com",
      company: "Test",
      role: "Founder",
      status: "lead" as const,
    };
    const {
      contact: { id },
    } = await client.contacts.create(input);
    await client.contacts.update({ ...input, id, status: "customer" });
    const [updated] = await db.select().from(contacts).where(eq(contacts.id, id));
    assert.equal(updated.status, "customer");
    await client.contacts.delete({ id });
    await assert.rejects(
      client.contacts.update({ ...input, id: foreignContact.id }),
      /Contact not found/,
    );
    await assert.rejects(client.contacts.delete({ id: foreignContact.id }), /Contact not found/);
    await assert.rejects(
      db.transaction((tx) => checkContact(tx, tenant.id, foreignContact.id)),
      /Contact not found/,
    );
    const [unchanged] = await db.select().from(contacts).where(eq(contacts.id, foreignContact.id));
    assert.equal(
      unchanged.name,
      foreignContact.name,
      "Rejected cross-tenant writes must preserve the other workspace",
    );
    await assert.rejects(client.contacts.create({ ...input, name: "", email: "invalid" }));
    for (let i = 30; i < RECORD_LIMIT - 1; i++)
      await client.contacts.create({ ...input, name: `Limit test ${i}` });
    const concurrent = await Promise.allSettled(
      Array.from({ length: 5 }, () => client.contacts.create(input)),
    );
    assert.equal(
      concurrent.filter((r) => r.status === "fulfilled").length,
      1,
      "Only one concurrent insert can claim the last available slot",
    );
    assert.equal(concurrent.filter((r) => r.status === "rejected").length, 4);
    const [total] = await db
      .select({ total: count() })
      .from(contacts)
      .where(eq(contacts.tenantId, tenant.id));
    assert.equal(total.total, RECORD_LIMIT, "Racing inserts must never exceed the 50-record limit");
    await assert.rejects(client.contacts.create(input), /50 records/);
    console.log(
      "PASS: real PostgreSQL anonymous auth + persistent session, concurrent/idempotent provisioning, saved pipeline sorting + positional stage moves, tenant isolation + rejected cross-tenant writes, validated CRUD, and concurrent 50-record limit enforcement.",
    );
  } finally {
    hookDiscovery.mock.restore();
    for (const id of users) await db.delete(user).where(eq(user.id, id));
    const remaining = await db
      .select()
      .from(tenants)
      .where(eq(tenants.userId, users[0] ?? "missing"));
    assert.equal(remaining.length, 0, "Deleting test accounts must cascade demo data");
    await pool.end();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
