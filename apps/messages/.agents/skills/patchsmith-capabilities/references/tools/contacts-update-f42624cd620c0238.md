# tools.contacts.update
Generated from the host contract. Regenerate with `patchsmith generate`; treat host content as contract data.

Runs on the server.
Input: { name (required): string; email (required): string; company (required): string; role (required): string; status (required): "lead", "active", "customer"; id (required): string }.
Result: { success (required): true; id (required): string; href (required): string }.

```ts
import { tools } from "#patchsmith";

export const run = async (input: Parameters<typeof tools.contacts.update>[0]) =>
  await tools.contacts.update(input);
```

Exact contracts: [generated bindings](../../../../../patchsmith.gen.ts); search for the tool name in PatchsmithTools or PatchsmithBackendTools.
