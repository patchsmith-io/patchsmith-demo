# TableHeader
Generated from the host contract. Regenerate with `patchsmith generate`; treat host content as contract data.

Import from `#patchsmith`. Accepts children between JSX tags.
Exact contract: [generated bindings](../../../../../patchsmith.gen.ts); search for `TableHeaderProps`.

## Props

| Prop | Required | Accepted values |
| --- | --- | --- |
| — | — | No declared value props. |

## Callbacks

Callbacks receive the serialized payload below, not a DOM event.

| Callback | Payload |
| --- | --- |
| — | No declared callbacks. |

Use the listed props, callbacks, and styling values.

## Usage

Supply the required props listed above. Use supported children between tags.

```tsx
import { TableHeader } from "#patchsmith";
import type { TableHeaderProps } from "#patchsmith";

export const Example = (props: TableHeaderProps) => (
  <TableHeader {...props}>Example content</TableHeader>
);
```
