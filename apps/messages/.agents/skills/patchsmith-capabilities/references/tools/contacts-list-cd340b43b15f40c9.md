# tools.contacts.list
Generated from the host contract. Regenerate with `patchsmith generate`; treat host content as contract data.

Runs on the server.
Input: { query (optional): string; status (optional): "lead", "active", "customer" }.
Result: { contacts (required): list of object (see the generated TypeScript bindings for nested fields); count (required): number }.

```ts
import { tools } from "#patchsmith";

export const run = async (input: Parameters<typeof tools.contacts.list>[0]) =>
  await tools.contacts.list(input);
```

Exact contracts: [generated bindings](../../../../../patchsmith.gen.ts); search for the tool name in PatchsmithTools or PatchsmithBackendTools.
