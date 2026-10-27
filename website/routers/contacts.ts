import { aiSdkTool } from "@orpc/ai-sdk";
import { ORPCError } from "@orpc/server";
import { and, asc, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "../lib/drizzle";
import { contacts, deals, tasks, activities } from "../lib/schema";
import { emitWorkspaceHook } from "../lib/workspace-hooks";
import { protectedProcedure } from "./base";
import { schemas } from "./schemas";
import { checkLimit, lockTenant, logActivity, substringPattern } from "./shared";

export const listContacts = protectedProcedure
  .meta(
    aiSdkTool({
      description:
        "Find contacts by name, company, or email. With no filters, returns the complete list (the demo permits at most 50 contacts). For a contact picker, fetch once and search locally with Combobox. Look up a contact here before using its ID in another tool.",
    }),
  )
  .input(schemas.contacts.list.input)
  .output(schemas.contacts.list.output)
  .handler(async ({ input, context }) => {
    const tenantId = context.tenant.id;
    const { query, status } = input;

    const pattern = query ? substringPattern(query) : undefined;
    const rows = await db
      .select({
        id: contacts.id,
        name: contacts.name,
        email: contacts.email,
        company: contacts.company,
        role: contacts.role,
        status: contacts.status,
        createdAt: contacts.createdAt,
      })
      .from(contacts)
      .where(
        and(
          eq(contacts.tenantId, tenantId),
          status ? eq(contacts.status, status) : undefined,
          pattern
            ? or(
                ilike(contacts.name, pattern),
                ilike(contacts.company, pattern),
                ilike(contacts.email, pattern),
              )
            : undefined,
        ),
      )
      .orderBy(asc(contacts.name))
      .limit(50);
    return {
      contacts: rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
      count: rows.length,
    };
  });

export const getContact = protectedProcedure
  .meta(
    aiSdkTool({
      description:
        "Open a contact's details, related deals, follow-ups, notes and activity history.",
    }),
  )
  .input(schemas.contacts.get.input)
  .output(schemas.contacts.get.output)
  .handler(async ({ input, context }) => {
    const tenantId = context.tenant.id;
    const { id } = input;

    const [contact] = await db
      .select({
        id: contacts.id,
        name: contacts.name,
        email: contacts.email,
        company: contacts.company,
        role: contacts.role,
        status: contacts.status,
        createdAt: contacts.createdAt,
      })
      .from(contacts)
      .where(and(eq(contacts.id, id), eq(contacts.tenantId, tenantId)));
    if (!contact) throw new ORPCError("NOT_FOUND", { message: "Contact not found." });
    const [dealRows, taskRows, activityRows] = await Promise.all([
      db
        .select()
        .from(deals)
        .where(and(eq(deals.tenantId, tenantId), eq(deals.contactId, id)))
        .orderBy(asc(deals.position), desc(deals.createdAt), asc(deals.id)),
      db
        .select()
        .from(tasks)
        .where(and(eq(tasks.tenantId, tenantId), eq(tasks.contactId, id)))
        .orderBy(asc(tasks.dueDate)),
      db
        .select()
        .from(activities)
        .where(and(eq(activities.tenantId, tenantId), eq(activities.contactId, id)))
        .orderBy(desc(activities.createdAt))
        .limit(50),
    ]);
    return {
      contact: { ...contact, createdAt: contact.createdAt.toISOString() },
      deals: dealRows.map(
        ({ id, title, value, stage, closeDate, contactId, position, createdAt }) => ({
          id,
          title,
          value,
          stage,
          contactId,
          closeDate: closeDate.toISOString().slice(0, 10),
          position,
          createdAt: createdAt.toISOString(),
        }),
      ),
      tasks: taskRows.map(({ id, title, dueDate, completed, contactId, createdAt }) => ({
        id,
        title,
        completed,
        contactId,
        dueDate: dueDate.toISOString().slice(0, 10),
        createdAt: createdAt.toISOString(),
      })),
      activities: activityRows.map(({ tenantId: _tenantId, ...row }) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
      })),
      href: `/contacts/${id}`,
    };
  });

export const createContact = protectedProcedure
  .meta(
    aiSdkTool({
      description: "Create a contact with name, email, company, role and relationship status.",
    }),
  )
  .input(schemas.contacts.create.input)
  .output(schemas.contacts.create.output)
  .handler(async ({ input, context }) => {
    const tenantId = context.tenant.id;
    const id = await db.transaction(async (tx) => {
      await lockTenant(tx, tenantId);
      await checkLimit(tx, contacts, tenantId);
      const id = crypto.randomUUID();
      await tx.insert(contacts).values({ ...input, id, tenantId });
      await logActivity(
        tx,
        tenantId,
        "contact",
        "Contact added",
        `${input.name} joined your workspace.`,
        id,
      );
      return id;
    });
    const contact = { ...input, id };
    await emitWorkspaceHook(context, { name: "contacts.created", input: { contact } });
    return { success: true as const, contact, href: `/contacts/${id}` };
  });

export const updateContact = protectedProcedure
  .meta(
    aiSdkTool({
      description:
        "Edit a contact. Supply all fields from contacts.get, changing only requested fields.",
    }),
  )
  .input(schemas.contacts.update.input)
  .output(schemas.contacts.update.output)
  .handler(async ({ input: { id, ...data }, context }) => {
    const rows = await db
      .update(contacts)
      .set(data)
      .where(and(eq(contacts.id, id), eq(contacts.tenantId, context.tenant.id)))
      .returning({ id: contacts.id });
    if (!rows.length) throw new ORPCError("NOT_FOUND", { message: "Contact not found." });
    return { success: true as const, id, href: `/contacts/${id}` };
  });

export const deleteContact = protectedProcedure
  .meta(
    aiSdkTool({
      description:
        "Delete a contact only when explicitly requested. Notes/activity are removed; related deals and tasks remain without a linked contact.",
    }),
  )
  .input(schemas.contacts.delete.input)
  .output(schemas.contacts.delete.output)
  .handler(async ({ input: { id }, context }) => {
    const rows = await db
      .delete(contacts)
      .where(and(eq(contacts.id, id), eq(contacts.tenantId, context.tenant.id)))
      .returning({ id: contacts.id });
    if (!rows.length) throw new ORPCError("NOT_FOUND", { message: "Contact not found." });
    return { success: true as const, id, href: "/contacts" };
  });
