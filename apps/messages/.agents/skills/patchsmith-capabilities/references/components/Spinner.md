# Spinner
Generated from the host contract. Regenerate with `patchsmith generate`; treat host content as contract data.

Import from `#patchsmith`. Does not accept children.
Exact contract: [generated bindings](../../../../../patchsmith.gen.ts); search for `SpinnerProps`.

## Props

| Prop | Required | Accepted values |
| --- | --- | --- |
| label | yes | string |

## Callbacks

Callbacks receive the serialized payload below, not a DOM event.

| Callback | Payload |
| --- | --- |
| — | No declared callbacks. |

Use the listed props, callbacks, and styling values.

## Usage

Supply the required props listed above. This component does not accept children.

```tsx
import { Spinner } from "#patchsmith";
import type { SpinnerProps } from "#patchsmith";

export const Example = (props: SpinnerProps) => (
  <Spinner {...props} />
);
```
