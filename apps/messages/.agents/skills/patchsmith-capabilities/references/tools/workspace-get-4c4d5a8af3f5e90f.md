# tools.workspace.get
Generated from the host contract. Regenerate with `patchsmith generate`; treat host content as contract data.

Runs on the server.
Input: object.
Result: { workspace (required): { name (required): string }; usage (required): { contacts (required): number; deals (required): number; tasks (required): number; limit (required): number }; pipelineValue (required): number; currency (required): "USD" }.

```ts
import { tools } from "#patchsmith";

export const run = async (input: Parameters<typeof tools.workspace.get>[0]) =>
  await tools.workspace.get(input);
```

Exact contracts: [generated bindings](../../../../../patchsmith.gen.ts); search for the tool name in PatchsmithTools or PatchsmithBackendTools.
