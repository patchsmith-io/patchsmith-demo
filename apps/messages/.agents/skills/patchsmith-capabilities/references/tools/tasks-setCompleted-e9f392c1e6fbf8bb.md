# tools.tasks.setCompleted
Generated from the host contract. Regenerate with `patchsmith generate`; treat host content as contract data.

Runs on the server.
Input: { id (required): string; completed (required): boolean }.
Result: { success (required): true; task (required): { id (required): string; title (required): string; completed (required): boolean }; href (required): string }.

```ts
import { tools } from "#patchsmith";

export const run = async (input: Parameters<typeof tools.tasks.setCompleted>[0]) =>
  await tools.tasks.setCompleted(input);
```

Exact contracts: [generated bindings](../../../../../patchsmith.gen.ts); search for the tool name in PatchsmithTools or PatchsmithBackendTools.
