import { defineView } from "patchsmith/client";
import { Badge, Card, Empty, Button, Flex, Grid, Heading, Separator, Text } from "#patchsmith";
import { useBilling } from "../../use-billing";
import { BillingStatus, LoadState, Stat } from "../../components";
import { money, shortDate, STRIPE_DEMO_URL } from "../../billing";

const view = defineView({ view: "/contacts/detail", component: ContactBilling });

function ContactBilling() {
  const { workspace, contact } = view.useContext();
  return <Billing key={`${workspace.id}:${contact.id}`} contactId={contact.id} />;
}

function Billing({ contactId }: { contactId: string }) {
  const state = useBilling();
  const customer = state.customers.find(({ id }) => id === contactId);
  if (state.loading || state.error) return <LoadState {...state} />;
  if (!customer)
    return (
      <Empty
        title="Contact unavailable"
        description="This contact may have been removed. Open another contact to see their billing."
      />
    );
  const { billing } = customer;
  const paid = billing.invoices.filter(({ status }) => status === "paid");
  return (
    <Flex direction="column" gap="5" height="full" overflow="auto">
      <Flex direction="column" gap="2">
        <Heading text="Stripe" />
        <Text text={customer.name} size="lg" />
        <Text text={customer.email} tone="muted" size="sm" />
      </Flex>
      <Grid columns={2} gap="3">
        <Stat
          label="Total paid"
          value={money(paid.reduce((sum, invoice) => sum + invoice.amount, 0))}
        />
        <Stat
          label="Open balance"
          value={money(
            billing.invoices
              .filter(({ status }) => status === "open")
              .reduce((sum, invoice) => sum + invoice.amount, 0),
          )}
        />
      </Grid>
      <Card title="Subscription">
        <Flex direction="column" gap="3">
          <Flex justify="between" align="center">
            <Text text={`${billing.plan} plan`} />
            <BillingStatus status={billing.status} />
          </Flex>
          <Text text={`${money(billing.monthlyAmount)} / month`} size="lg" />
          <Text
            text={
              billing.status === "canceled"
                ? "Subscription canceled"
                : `${billing.status === "trialing" ? "Trial ends" : "Next billing date"} · ${shortDate(billing.renewalDate)}`
            }
            size="sm"
            tone="muted"
          />
          <Separator />
          <Text text={`${billing.cardBrand} •••• ${billing.cardLast4}`} size="sm" />
          <Text text={billing.customerId} size="xs" tone="muted" />
        </Flex>
      </Card>
      {billing.status === "past_due" ? (
        <Text
          text="The latest invoice is overdue. Payment needs attention."
          tone="warning"
          size="sm"
        />
      ) : null}
      <Heading text="Recent invoices" level="h3" />
      {billing.invoices.length ? (
        <Flex direction="column" gap="3">
          {billing.invoices.map((invoice) => (
            <Flex
              key={invoice.id}
              justify="between"
              align="center"
              gap="3"
              border="solid"
              padding="3"
              radius="lg"
            >
              <Flex direction="column" gap="1">
                <Text text={money(invoice.amount)} size="sm" />
                <Text text={shortDate(invoice.date)} size="xs" tone="muted" />
              </Flex>
              <Badge
                text={
                  invoice.status === "paid" ? "Paid" : invoice.status === "open" ? "Open" : "Void"
                }
                variant={
                  invoice.status === "paid"
                    ? "success"
                    : invoice.status === "open"
                      ? "warning"
                      : "secondary"
                }
              />
            </Flex>
          ))}
        </Flex>
      ) : (
        <Text text="No invoices yet. This contact is on a trial." tone="muted" size="sm" />
      )}
      <Button label="View in Stripe" href={STRIPE_DEMO_URL} variant="outline" />
    </Flex>
  );
}

export default view;
