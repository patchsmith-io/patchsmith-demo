# tools.ui.notify
Generated from the host contract. Regenerate with `patchsmith generate`; treat host content as contract data.

Runs on the client.
Input: { title (required): string; description (optional): string; type (optional): "success", "error", "info", "warning" }.
Result: no payload.

```ts
import { tools } from "#patchsmith";

export const run = async (input: Parameters<typeof tools.ui.notify>[0]) =>
  await tools.ui.notify(input);
```

Exact contracts: [generated bindings](../../../../../patchsmith.gen.ts); search for the tool name in PatchsmithTools or PatchsmithBackendTools.
