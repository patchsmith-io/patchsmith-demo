import { z } from "zod";

export const STRIPE_DEMO_URL = "https://dashboard.stripe.com/test/forma-demo";
export const contactSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  company: z.string(),
});
export type Contact = z.infer<typeof contactSchema>;
export const billingSchema = z.object({
  customerId: z.string(),
  plan: z.enum(["Starter", "Growth", "Scale"]),
  status: z.enum(["active", "trialing", "past_due", "canceled"]),
  monthlyAmount: z.number().int().nonnegative(),
  cardBrand: z.enum(["Visa", "Mastercard"]),
  cardLast4: z.string(),
  renewalDate: z.string(),
  seededAt: z.string(),
  invoices: z.array(
    z.object({
      id: z.string(),
      date: z.string(),
      amount: z.number().int().nonnegative(),
      status: z.enum(["paid", "open", "void"]),
    }),
  ),
});
export type Billing = z.infer<typeof billingSchema>;
export type Customer = Contact & { billing: Billing };

function hash(value: string) {
  let result = 2166136261;
  for (const character of value) result = Math.imul(result ^ character.charCodeAt(0), 16777619);
  return result >>> 0;
}

// Amounts are integer USD cents. Dates are anchored once, when this contact is seeded.
export function seedBilling(contactId: string, now = new Date()): Billing {
  const seed = hash(contactId);
  const plans = ["Starter", "Growth", "Scale"] as const;
  const planIndex = seed % plans.length;
  const monthlyAmount = [4900, 14900, 39900][planIndex];
  const status = (
    ["active", "active", "active", "active", "trialing", "past_due", "active", "canceled"] as const
  )[(seed >>> 4) % 8];
  const anchor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 10 + (seed % 15)));
  const date = (month: number) =>
    new Date(
      Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + month, anchor.getUTCDate()),
    ).toISOString();
  const invoiceCount = status === "trialing" ? 0 : 3 + ((seed >>> 8) % 4);
  return {
    customerId: `cus_demo_${contactId.replaceAll("-", "")}`,
    plan: plans[planIndex],
    status,
    monthlyAmount,
    cardBrand: seed % 2 ? "Visa" : "Mastercard",
    cardLast4: String(1000 + ((seed >>> 12) % 9000)),
    renewalDate: date(1),
    seededAt: now.toISOString(),
    invoices: Array.from({ length: invoiceCount }, (_, i) => ({
      id: `in_demo_${seed.toString(16)}_${i + 1}`,
      date: date(-i),
      amount: monthlyAmount,
      status:
        i === 0 && status === "past_due"
          ? "open"
          : i === 0 && status === "canceled"
            ? "void"
            : "paid",
    })),
  };
}

export function summarize(customers: Customer[]) {
  let revenue = 0,
    mrr = 0,
    outstanding = 0,
    active = 0,
    trials = 0,
    pastDue = 0;
  const months = new Map<string, number>();
  const invoices: (Billing["invoices"][number] & { contactId: string; name: string })[] = [];
  for (const { id, name, billing } of customers) {
    if (billing.status === "active" || billing.status === "past_due") mrr += billing.monthlyAmount;
    if (billing.status === "active") active++;
    if (billing.status === "trialing") trials++;
    if (billing.status === "past_due") pastDue++;
    for (const invoice of billing.invoices) {
      invoices.push({ ...invoice, contactId: id, name });
      const month = invoice.date.slice(0, 7);
      if (!months.has(month)) months.set(month, 0);
      if (invoice.status === "paid") {
        revenue += invoice.amount;
        months.set(month, (months.get(month) ?? 0) + invoice.amount);
      } else if (invoice.status === "open") outstanding += invoice.amount;
    }
  }
  return {
    revenue,
    mrr,
    outstanding,
    active,
    trials,
    pastDue,
    months: [...months]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, amount]) => ({ month, amount })),
    invoices: invoices
      .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id))
      .slice(0, 10),
  };
}

const dollars = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
export const money = (cents: number) => dollars.format(cents / 100);
export const shortDate = (date: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
export const statusLabel = (status: Billing["status"]) =>
  ({ active: "Active", trialing: "Trial", past_due: "Past due", canceled: "Canceled" })[status];
