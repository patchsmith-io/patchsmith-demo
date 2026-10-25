import { z } from "zod";

export const recordId = z.string().min(1).max(200);
export const stage = z.enum(["qualified", "proposal", "negotiation", "won", "lost"]);
export const status = z.enum(["lead", "active", "customer"]);
export const date = z.iso.date().describe("Calendar date in YYYY-MM-DD format.");
const query = z.string().trim().max(120).optional();
const contactId = recordId.nullable().optional();
const title = z.string().trim().min(2).max(120);
const value = z.number().int().min(0).max(10000000).describe("Whole USD, not cents.");
export const contactFields = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().max(120),
  company: z.string().trim().min(1).max(80),
  role: z.string().trim().min(1).max(80),
  status,
});
const contact = contactFields.extend({ id: recordId, email: z.string() });
const deal = z.object({
  id: recordId,
  title,
  value,
  stage,
  closeDate: date,
  contactId: recordId.nullable(),
});
const task = z.object({
  id: recordId,
  title,
  dueDate: date,
  contactId: recordId.nullable(),
  completed: z.boolean(),
});
const contactRecord = contact.extend({ createdAt: z.iso.datetime() });
const dealRecord = deal.extend({ createdAt: z.iso.datetime(), position: z.number() });
const taskRecord = task.extend({ createdAt: z.iso.datetime() });
const activity = z.object({
  id: recordId,
  contactId: recordId.nullable(),
  type: z.enum(["note", "contact", "deal", "task"]),
  title: z.string(),
  description: z.string(),
  createdAt: z.iso.datetime(),
});
const saved = z.object({ success: z.literal(true), id: recordId, href: z.string() });
const dealFields = z.object({
  title,
  value,
  stage,
  closeDate: date,
  contactId: recordId.nullable(),
});
const taskFields = z.object({ title, dueDate: date, contactId: recordId.nullable() });

// Browser-safe schemas shared by Patchsmith, the agent, and integration tests.
export const schemas = {
  workspace: {
    get: {
      input: z.object({}),
      output: z.object({
        workspace: z.object({ name: z.string() }),
        usage: z.object({
          contacts: z.number(),
          deals: z.number(),
          tasks: z.number(),
          limit: z.number(),
        }),
        pipelineValue: z.number(),
        currency: z.literal("USD"),
      }),
    },
  },
  contacts: {
    list: {
      input: z
        .object({ query, status: status.optional() })
        .describe(
          "Returns all matching contacts, up to the demo's 50-contact workspace limit. Pass {} for the complete list; fetch once for a Combobox and filter locally rather than calling this tool on each keystroke.",
        ),
      output: z.object({ contacts: z.array(contactRecord), count: z.number() }),
    },
    get: {
      input: z.object({ id: recordId }),
      output: z.object({
        contact: contactRecord,
        deals: z.array(dealRecord),
        tasks: z.array(taskRecord),
        activities: z.array(activity),
        href: z.string(),
      }),
    },
    create: {
      input: contactFields,
      output: z.object({ success: z.literal(true), contact, href: z.string() }),
    },
    update: { input: contactFields.extend({ id: recordId }), output: saved },
    delete: { input: z.object({ id: recordId }), output: saved },
  },
  deals: {
    list: {
      input: z.object({ query, stage: stage.optional(), contactId: recordId.optional() }),
      output: z.object({
        deals: z.array(
          dealRecord.extend({
            contact: z.string().nullable(),
            company: z.string().nullable(),
          }),
        ),
        count: z.number(),
        totalValue: z.number(),
        currency: z.literal("USD"),
      }),
    },
    create: {
      input: z.object({
        title,
        value,
        stage: stage.optional(),
        closeDate: date.optional(),
        contactId,
      }),
      output: z.object({ success: z.literal(true), deal, href: z.string() }),
    },
    update: { input: dealFields.extend({ id: recordId }), output: saved },
    delete: { input: z.object({ id: recordId }), output: saved },
    move: {
      input: z.object({
        id: recordId,
        stage,
        targetId: recordId.optional(),
        placement: z.enum(["before", "after"]).optional(),
      }),
      output: saved.extend({ stage }),
    },
  },
  tasks: {
    list: {
      input: z.object({ query, completed: z.boolean().optional(), contactId: recordId.optional() }),
      output: z.object({ tasks: z.array(taskRecord), count: z.number() }),
    },
    create: {
      input: z.object({ title, dueDate: date, contactId }),
      output: z.object({ success: z.literal(true), task, href: z.string() }),
    },
    update: { input: taskFields.extend({ id: recordId }), output: saved },
    delete: { input: z.object({ id: recordId }), output: saved },
    setCompleted: {
      input: z.object({ id: recordId, completed: z.boolean() }),
      output: z.object({
        success: z.literal(true),
        task: task.pick({ id: true, title: true, completed: true }),
        href: z.string(),
      }),
    },
  },
  activities: {
    list: {
      input: z.object({ contactId: recordId.optional() }),
      output: z.object({ activities: z.array(activity), count: z.number() }),
    },
    addNote: {
      input: z.object({
        contactId: recordId,
        body: z.string().min(1).max(1000).regex(/\S/, "Enter a note."),
      }),
      output: saved,
    },
  },
};
