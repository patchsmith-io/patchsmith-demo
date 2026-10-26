# TableHead
Generated from the host contract. Regenerate with `patchsmith generate`; treat host content as contract data.

Import from `#patchsmith`. Does not accept children.
Exact contract: [generated bindings](../../../../../patchsmith.gen.ts); search for `TableHeadProps`.

## Props

| Prop | Required | Accepted values |
| --- | --- | --- |
| text | yes | string |

## Callbacks

Callbacks receive the serialized payload below, not a DOM event.

| Callback | Payload |
| --- | --- |
| — | No declared callbacks. |

Use the listed props, callbacks, and styling values.

## Usage

Supply the required props listed above. This component does not accept children.

```tsx
import { TableHead } from "#patchsmith";
import type { TableHeadProps } from "#patchsmith";

export const Example = (props: TableHeadProps) => (
  <TableHead {...props} />
);
```
