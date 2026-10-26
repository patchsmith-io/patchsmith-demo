import { defineView } from "patchsmith/client";
import { Button } from "#patchsmith";
import { STRIPE_DEMO_URL } from "../../lib/billing";

export default defineView({ view: "/contacts/detail", component: StripeLink });

function StripeLink() {
  return <Button label="View on Stripe" href={STRIPE_DEMO_URL} variant="outline" />;
}
