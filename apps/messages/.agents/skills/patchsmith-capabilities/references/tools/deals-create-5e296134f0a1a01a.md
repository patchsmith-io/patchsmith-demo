# tools.deals.create
Generated from the host contract. Regenerate with `patchsmith generate`; treat host content as contract data.

Runs on the server.
Input: { title (required): string; value (required): integer (minimum: 0; maximum: 10000000); stage (optional): "qualified", "proposal", "negotiation", "won", "lost"; closeDate (optional): string; contactId (optional): string; or null }.
Result: { success (required): true; deal (required): { id (required): string; title (required): string; value (required): integer (minimum: 0; maximum: 10000000); stage (required): "qualified", "proposal", "negotiation", "won", "lost"; closeDate (required): string; contactId (required): string; or null }; href (required): string }.

```ts
import { tools } from "#patchsmith";

export const run = async (input: Parameters<typeof tools.deals.create>[0]) =>
  await tools.deals.create(input);
```

Exact contracts: [generated bindings](../../../../../patchsmith.gen.ts); search for the tool name in PatchsmithTools or PatchsmithBackendTools.
