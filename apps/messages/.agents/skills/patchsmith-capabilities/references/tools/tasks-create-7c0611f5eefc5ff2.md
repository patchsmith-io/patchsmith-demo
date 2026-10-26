# tools.tasks.create
Generated from the host contract. Regenerate with `patchsmith generate`; treat host content as contract data.

Runs on the server.
Input: { title (required): string; dueDate (required): string; contactId (optional): string; or null }.
Result: { success (required): true; task (required): { id (required): string; title (required): string; dueDate (required): string; contactId (required): string; or null; completed (required): boolean }; href (required): string }.

```ts
import { tools } from "#patchsmith";

export const run = async (input: Parameters<typeof tools.tasks.create>[0]) =>
  await tools.tasks.create(input);
```

Exact contracts: [generated bindings](../../../../../patchsmith.gen.ts); search for the tool name in PatchsmithTools or PatchsmithBackendTools.
