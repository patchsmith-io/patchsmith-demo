# tools.ui.refresh
Generated from the host contract. Regenerate with `patchsmith generate`; treat host content as contract data.

Runs on the client.
Input: no payload.
Result: no payload.

```ts
import { tools } from "#patchsmith";

export const run = async () =>
  await tools.ui.refresh();
```

Exact contracts: [generated bindings](../../../../../patchsmith.gen.ts); search for the tool name in PatchsmithTools or PatchsmithBackendTools.
