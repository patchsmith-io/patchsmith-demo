import { defineRouter } from "patchsmith/server";
import { asc, eq } from "patchsmith/db";
import { z } from "zod";
import { fn } from "../db";
import { customers } from "../db/schema";
import { billingSchema, contactSchema, seedBilling } from "../lib/billing";

// Internal writes accept only contacts fetched by the backend from the scoped host tool.
const reconcile = fn.mutation
  .internal()
  .input(z.object({ contacts: z.array(contactSchema).max(50) }))
  .handler(({ db, input }) => {
    const existing = db.select().from(customers).all();
    const ids = new Set(input.contacts.map(({ id }) => id));
    for (const row of existing) {
      if (!ids.has(row.contactId))
        db.delete(customers).where(eq(customers.contactId, row.contactId)).run();
    }
    for (const { id: contactId, name, email, company } of input.contacts) {
      db.insert(customers)
        .values({
          contactId,
          name,
          email,
          company,
          billing: JSON.stringify(seedBilling(contactId)),
        })
        .onConflictDoUpdate({ target: customers.contactId, set: { name, email, company } })
        .run();
    }
    return { count: input.contacts.length };
  });

export default defineRouter({
  reconcile,
  sync: fn.action
    .input(z.object({}))
    .functions({ billing: { reconcile } })
    .handler(async ({ tools, mutations }) => {
      const result = await tools.contacts.list({});
      return mutations.billing.reconcile({ contacts: result.contacts });
    }),
  list: fn.query.input(z.object({})).handler(({ db }) =>
    db
      .select()
      .from(customers)
      .orderBy(asc(customers.name))
      .all()
      .map((row) => ({
        id: row.contactId,
        name: row.name,
        email: row.email,
        company: row.company,
        billing: billingSchema.parse(JSON.parse(row.billing)),
      })),
  ),
});
