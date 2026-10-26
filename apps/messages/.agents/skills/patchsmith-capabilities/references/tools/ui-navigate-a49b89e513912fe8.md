# tools.ui.navigate
Generated from the host contract. Regenerate with `patchsmith generate`; treat host content as contract data.

Runs on the client.
Input: { href (required): string }.
Result: no payload.

```ts
import { tools } from "#patchsmith";

export const run = async (input: Parameters<typeof tools.ui.navigate>[0]) =>
  await tools.ui.navigate(input);
```

Exact contracts: [generated bindings](../../../../../patchsmith.gen.ts); search for the tool name in PatchsmithTools or PatchsmithBackendTools.
