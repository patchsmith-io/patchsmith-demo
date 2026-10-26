# tools.deals.list
Generated from the host contract. Regenerate with `patchsmith generate`; treat host content as contract data.

Runs on the server.
Input: { query (optional): string; stage (optional): "qualified", "proposal", "negotiation", "won", "lost"; contactId (optional): string }.
Result: { deals (required): list of object (see the generated TypeScript bindings for nested fields); count (required): number; totalValue (required): number; currency (required): "USD" }.

```ts
import { tools } from "#patchsmith";

export const run = async (input: Parameters<typeof tools.deals.list>[0]) =>
  await tools.deals.list(input);
```

Exact contracts: [generated bindings](../../../../../patchsmith.gen.ts); search for the tool name in PatchsmithTools or PatchsmithBackendTools.
