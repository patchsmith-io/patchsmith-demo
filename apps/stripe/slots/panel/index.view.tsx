import { defineView } from "patchsmith/client";
import { Empty, Flex } from "#patchsmith";

export default defineView({ view: "/", component: StripeEmpty });

function StripeEmpty() {
  return (
    <Flex direction="column" justify="center" height="full">
      <Empty
        icon="users"
        title="Select a contact"
        description="Open a contact to see their Stripe subscriptions, payments, and invoices."
      />
    </Flex>
  );
}
