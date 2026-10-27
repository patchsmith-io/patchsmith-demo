import { aiSdkTool } from "@orpc/ai-sdk";
import { ORPCError } from "@orpc/server";
import { and, asc, eq, ilike, ne } from "drizzle-orm";
import { db } from "../lib/drizzle";
import { tasks } from "../lib/schema";
import { emitWorkspaceHook } from "../lib/workspace-hooks";
import { protectedProcedure } from "./base";
import { schemas } from "./schemas";
import { checkContact, checkLimit, lockTenant, logActivity, substringPattern } from "./shared";

export const listTasks = protectedProcedure
  .meta(
    aiSdkTool({
      description:
        "View follow-up tasks, optionally searching their title and filtering by completion status.",
    }),
  )
  .input(schemas.tasks.list.input)
  .output(schemas.tasks.list.output)
  .handler(async ({ input, context }) => {
    const tenantId = context.tenant.id;
    const { query, completed, contactId } = input;

    const pattern = query ? substringPattern(query) : undefined;
    const rows = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        dueDate: tasks.dueDate,
        createdAt: tasks.createdAt,
        completed: tasks.completed,
        contactId: tasks.contactId,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.tenantId, tenantId),
          contactId ? eq(tasks.contactId, contactId) : undefined,
          pattern ? ilike(tasks.title, pattern) : undefined,
          completed === undefined ? undefined : eq(tasks.completed, completed),
        ),
      )
      .orderBy(asc(tasks.dueDate))
      .limit(50);
    return {
      tasks: rows.map((row) => ({
        ...row,
        dueDate: row.dueDate.toISOString().slice(0, 10),
        createdAt: row.createdAt.toISOString(),
      })),
      count: rows.length,
    };
  });

export const createTask = protectedProcedure
  .meta(
    aiSdkTool({
      description:
        "Create a follow-up with a title and calendar due date. Optionally link a contact found using contacts.list.",
    }),
  )
  .input(schemas.tasks.create.input)
  .output(schemas.tasks.create.output)
  .handler(async ({ input, context }) => {
    const tenantId = context.tenant.id;
    const record = { ...input, contactId: input.contactId ?? null };
    const id = await db.transaction(async (tx) => {
      await lockTenant(tx, tenantId);
      await checkLimit(tx, tasks, tenantId);
      await checkContact(tx, tenantId, record.contactId);
      const id = crypto.randomUUID();
      await tx.insert(tasks).values({ ...record, dueDate: new Date(record.dueDate), id, tenantId });
      await logActivity(tx, tenantId, "task", "Task added", record.title, record.contactId);
      return id;
    });
    return { success: true as const, task: { ...record, id, completed: false }, href: "/tasks" };
  });

export const updateTask = protectedProcedure
  .meta(
    aiSdkTool({
      description:
        "Edit a follow-up's title, due date and linked contact, preserving completion status.",
    }),
  )
  .input(schemas.tasks.update.input)
  .output(schemas.tasks.update.output)
  .handler(async ({ input: { id, ...data }, context }) => {
    const tenantId = context.tenant.id;
    await db.transaction(async (tx) => {
      await lockTenant(tx, tenantId);
      await checkContact(tx, tenantId, data.contactId);
      const rows = await tx
        .update(tasks)
        .set({ ...data, dueDate: new Date(data.dueDate) })
        .where(and(eq(tasks.id, id), eq(tasks.tenantId, tenantId)))
        .returning({ id: tasks.id });
      if (!rows.length) throw new ORPCError("NOT_FOUND", { message: "Task not found." });
      await logActivity(tx, tenantId, "task", "Task updated", data.title, data.contactId);
    });
    return { success: true as const, id, href: "/tasks" };
  });

export const deleteTask = protectedProcedure
  .meta(
    aiSdkTool({
      description: "Delete a follow-up only when explicitly requested. Look up its ID first.",
    }),
  )
  .input(schemas.tasks.delete.input)
  .output(schemas.tasks.delete.output)
  .handler(async ({ input: { id }, context }) => {
    const rows = await db
      .delete(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.tenantId, context.tenant.id)))
      .returning({ id: tasks.id });
    if (!rows.length) throw new ORPCError("NOT_FOUND", { message: "Task not found." });
    return { success: true as const, id, href: "/tasks" };
  });

export const setTaskCompleted = protectedProcedure
  .meta(
    aiSdkTool({
      description:
        "Mark a task complete or reopen it. Repeating the same boolean does not toggle the task.",
    }),
  )
  .input(schemas.tasks.setCompleted.input)
  .output(schemas.tasks.setCompleted.output)
  .handler(async ({ input: { id, completed }, context }) => {
    const fields = { id: tasks.id, title: tasks.title, completed: tasks.completed };
    const condition = and(eq(tasks.id, id), eq(tasks.tenantId, context.tenant.id));
    const [changed] = await db
      .update(tasks)
      .set({ completed })
      .where(and(condition, ne(tasks.completed, completed)))
      .returning(fields);
    const task = changed ?? (await db.select(fields).from(tasks).where(condition))[0];
    if (!task) throw new ORPCError("NOT_FOUND", { message: "Task not found." });
    if (changed?.completed)
      await emitWorkspaceHook(context, { name: "tasks.completed", input: { task: changed } });
    return { success: true as const, task, href: "/tasks" };
  });
