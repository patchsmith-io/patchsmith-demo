# tools.deals.move
Generated from the host contract. Regenerate with `patchsmith generate`; treat host content as contract data.

Runs on the server.
Input: { id (required): string; stage (required): "qualified", "proposal", "negotiation", "won", "lost"; targetId (optional): string; placement (optional): "before", "after" }.
Result: { success (required): true; id (required): string; href (required): string; stage (required): "qualified", "proposal", "negotiation", "won", "lost" }.

```ts
import { tools } from "#patchsmith";

export const run = async (input: Parameters<typeof tools.deals.move>[0]) =>
  await tools.deals.move(input);
```

Exact contracts: [generated bindings](../../../../../patchsmith.gen.ts); search for the tool name in PatchsmithTools or PatchsmithBackendTools.
