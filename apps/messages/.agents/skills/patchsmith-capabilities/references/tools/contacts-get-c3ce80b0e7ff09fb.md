# tools.contacts.get
Generated from the host contract. Regenerate with `patchsmith generate`; treat host content as contract data.

Runs on the server.
Input: { id (required): string }.
Result: { contact (required): { name (required): string; email (required): string; company (required): string; role (required): string; status (required): "lead", "active", "customer"; id (required): string; createdAt (required): string }; deals (required): list of object (see the generated TypeScript bindings for nested fields); tasks (required): list of object (see the generated TypeScript bindings for nested fields); activities (required): list of object (see the generated TypeScript bindings for nested fields); href (required): string }.

```ts
import { tools } from "#patchsmith";

export const run = async (input: Parameters<typeof tools.contacts.get>[0]) =>
  await tools.contacts.get(input);
```

Exact contracts: [generated bindings](../../../../../patchsmith.gen.ts); search for the tool name in PatchsmithTools or PatchsmithBackendTools.
