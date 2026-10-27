import { aiSdkTool } from "@orpc/ai-sdk";
import { ORPCError } from "@orpc/server";
import { and, asc, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "../lib/drizzle";
import { contacts, deals } from "../lib/schema";
import { emitWorkspaceHook } from "../lib/workspace-hooks";
import { protectedProcedure } from "./base";
import { schemas } from "./schemas";
import { checkContact, checkLimit, lockTenant, logActivity, substringPattern } from "./shared";

export const listDeals = protectedProcedure
  .meta(
    aiSdkTool({
      description:
        "View or search the current workspace's deals, optionally by stage. Returns live records and total value in USD.",
    }),
  )
  .input(schemas.deals.list.input)
  .output(schemas.deals.list.output)
  .handler(async ({ input, context }) => {
    const tenantId = context.tenant.id;
    const { query, stage, contactId } = input;

    const pattern = query ? substringPattern(query) : undefined;
    const rows = await db
      .select({
        id: deals.id,
        title: deals.title,
        value: deals.value,
        stage: deals.stage,
        position: deals.position,
        createdAt: deals.createdAt,
        closeDate: deals.closeDate,
        contactId: deals.contactId,
        contact: contacts.name,
        company: contacts.company,
      })
      .from(deals)
      .leftJoin(contacts, and(eq(contacts.id, deals.contactId), eq(contacts.tenantId, tenantId)))
      .where(
        and(
          eq(deals.tenantId, tenantId),
          stage ? eq(deals.stage, stage) : undefined,
          contactId ? eq(deals.contactId, contactId) : undefined,
          pattern
            ? or(
                ilike(deals.title, pattern),
                ilike(contacts.name, pattern),
                ilike(contacts.company, pattern),
              )
            : undefined,
        ),
      )
      .orderBy(asc(deals.position), desc(deals.createdAt), asc(deals.id))
      .limit(50);
    return {
      deals: rows.map((row) => ({
        ...row,
        closeDate: row.closeDate.toISOString().slice(0, 10),
        createdAt: row.createdAt.toISOString(),
      })),
      count: rows.length,
      totalValue: rows.reduce((total, row) => total + row.value, 0),
      currency: "USD" as const,
    };
  });

export const createDeal = protectedProcedure
  .meta(
    aiSdkTool({
      description:
        "Create a deal with a title and whole USD value. Defaults to qualified, no contact, and closing in 30 days.",
    }),
  )
  .input(schemas.deals.create.input)
  .output(schemas.deals.create.output)
  .handler(async ({ input, context }) => {
    const tenantId = context.tenant.id;
    const record = {
      ...input,
      stage: input.stage ?? ("qualified" as const),
      contactId: input.contactId ?? null,
      closeDate: input.closeDate ?? new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    };
    const id = await db.transaction(async (tx) => {
      await lockTenant(tx, tenantId);
      await checkLimit(tx, deals, tenantId);
      await checkContact(tx, tenantId, record.contactId);
      const id = crypto.randomUUID();
      await tx
        .insert(deals)
        .values({ ...record, closeDate: new Date(record.closeDate), id, tenantId });
      await logActivity(tx, tenantId, "deal", "Deal created", record.title, record.contactId);
      return id;
    });
    const deal = { ...record, id };
    await emitWorkspaceHook(context, { name: "deals.created", input: { deal } });
    return { success: true as const, deal, href: "/pipeline" };
  });

export const updateDeal = protectedProcedure
  .meta(
    aiSdkTool({
      description:
        "Edit a deal's title, whole USD value, stage, close date and contact. Preserve unspecified fields from deals.list.",
    }),
  )
  .input(schemas.deals.update.input)
  .output(schemas.deals.update.output)
  .handler(async ({ input: { id, ...data }, context }) => {
    const tenantId = context.tenant.id;
    await db.transaction(async (tx) => {
      await lockTenant(tx, tenantId);
      await checkContact(tx, tenantId, data.contactId);
      const rows = await tx
        .update(deals)
        .set({ ...data, closeDate: new Date(data.closeDate) })
        .where(and(eq(deals.id, id), eq(deals.tenantId, tenantId)))
        .returning({ id: deals.id });
      if (!rows.length) throw new ORPCError("NOT_FOUND", { message: "Deal not found." });
      await logActivity(
        tx,
        tenantId,
        "deal",
        "Deal updated",
        `${data.title} moved to ${data.stage}.`,
        data.contactId,
      );
    });
    return { success: true as const, id, href: "/pipeline" };
  });

export const deleteDeal = protectedProcedure
  .meta(
    aiSdkTool({
      description: "Delete an existing deal only when explicitly requested. Look up its ID first.",
    }),
  )
  .input(schemas.deals.delete.input)
  .output(schemas.deals.delete.output)
  .handler(async ({ input: { id }, context }) => {
    const rows = await db
      .delete(deals)
      .where(and(eq(deals.id, id), eq(deals.tenantId, context.tenant.id)))
      .returning({ id: deals.id });
    if (!rows.length) throw new ORPCError("NOT_FOUND", { message: "Deal not found." });
    return { success: true as const, id, href: "/pipeline" };
  });

export const moveDeal = protectedProcedure
  .meta(
    aiSdkTool({
      description:
        "Move or reorder a deal. Optionally place it before or after targetId in the destination stage. Look up IDs first.",
    }),
  )
  .input(schemas.deals.move.input)
  .output(schemas.deals.move.output)
  .handler(async ({ input: move, context }) => {
    const tenantId = context.tenant.id;
    await db.transaction(async (tx) => {
      await lockTenant(tx, tenantId);
      const records = await tx
        .select()
        .from(deals)
        .where(eq(deals.tenantId, tenantId))
        .orderBy(asc(deals.position), desc(deals.createdAt), asc(deals.id));
      const source = records.find((deal) => deal.id === move.id);
      if (!source) throw new ORPCError("NOT_FOUND", { message: "Deal not found." });
      if (move.targetId === source.id) {
        if (move.stage !== source.stage)
          throw new ORPCError("CONFLICT", {
            message: "A deal cannot target itself in a different stage.",
          });
        return;
      }
      const destination = records.filter(
        (deal) => deal.stage === move.stage && deal.id !== move.id,
      );
      const targetIndex = move.targetId
        ? destination.findIndex((deal) => deal.id === move.targetId)
        : destination.length;
      if (targetIndex < 0)
        throw new ORPCError("CONFLICT", {
          message: "The destination deal is no longer in this stage. Please try again.",
        });
      destination.splice(
        targetIndex + (move.targetId && move.placement === "after" ? 1 : 0),
        0,
        source,
      );
      for (const [position, deal] of destination.entries()) {
        await tx
          .update(deals)
          .set({ stage: move.stage, position })
          .where(and(eq(deals.id, deal.id), eq(deals.tenantId, tenantId)));
      }
      if (source.stage !== move.stage)
        await logActivity(
          tx,
          tenantId,
          "deal",
          "Deal updated",
          `${source.title} moved to ${move.stage}.`,
          source.contactId,
        );
    });
    return { success: true as const, id: move.id, stage: move.stage, href: "/pipeline" };
  });
