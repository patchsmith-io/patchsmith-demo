# tools.contacts.delete
Generated from the host contract. Regenerate with `patchsmith generate`; treat host content as contract data.

Runs on the server.
Input: { id (required): string }.
Result: { success (required): true; id (required): string; href (required): string }.

```ts
import { tools } from "#patchsmith";

export const run = async (input: Parameters<typeof tools.contacts.delete>[0]) =>
  await tools.contacts.delete(input);
```

Exact contracts: [generated bindings](../../../../../patchsmith.gen.ts); search for the tool name in PatchsmithTools or PatchsmithBackendTools.
