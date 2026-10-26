# Progress
Generated from the host contract. Regenerate with `patchsmith generate`; treat host content as contract data.

Import from `#patchsmith`. Does not accept children.
Exact contract: [generated bindings](../../../../../patchsmith.gen.ts); search for `ProgressProps`.

## Props

| Prop | Required | Accepted values |
| --- | --- | --- |
| label | yes | string |
| value | yes | number (minimum: 0; maximum: 100) |

## Callbacks

Callbacks receive the serialized payload below, not a DOM event.

| Callback | Payload |
| --- | --- |
| — | No declared callbacks. |

Use the listed props, callbacks, and styling values.

## Usage

Supply the required props listed above. This component does not accept children.

```tsx
import { Progress } from "#patchsmith";
import type { ProgressProps } from "#patchsmith";

export const Example = (props: ProgressProps) => (
  <Progress {...props} />
);
```
