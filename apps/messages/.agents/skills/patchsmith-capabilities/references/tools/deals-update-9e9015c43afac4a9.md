# tools.deals.update
Generated from the host contract. Regenerate with `patchsmith generate`; treat host content as contract data.

Runs on the server.
Input: { title (required): string; value (required): integer (minimum: 0; maximum: 10000000); stage (required): "qualified", "proposal", "negotiation", "won", "lost"; closeDate (required): string; contactId (required): string; or null; id (required): string }.
Result: { success (required): true; id (required): string; href (required): string }.

```ts
import { tools } from "#patchsmith";

export const run = async (input: Parameters<typeof tools.deals.update>[0]) =>
  await tools.deals.update(input);
```

Exact contracts: [generated bindings](../../../../../patchsmith.gen.ts); search for the tool name in PatchsmithTools or PatchsmithBackendTools.
