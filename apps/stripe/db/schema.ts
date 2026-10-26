import { table, text } from "patchsmith/db";

export const customers = table("customers", {
  contactId: text().primaryKey(),
  name: text().notNull(),
  email: text().notNull(),
  company: text().notNull(),
  billing: text().notNull(),
});
