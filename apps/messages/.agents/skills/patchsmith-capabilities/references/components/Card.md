# Card
Generated from the host contract. Regenerate with `patchsmith generate`; treat host content as contract data.

Import from `#patchsmith`. Accepts children between JSX tags.
Exact contract: [generated bindings](../../../../../patchsmith.gen.ts); search for `CardProps`.

## Props

| Prop | Required | Accepted values |
| --- | --- | --- |
| title | yes | string |
| description | no | string |

## Callbacks

Callbacks receive the serialized payload below, not a DOM event.

| Callback | Payload |
| --- | --- |
| — | No declared callbacks. |

Use the listed props, callbacks, and styling values.

## Usage

Supply the required props listed above. Use supported children between tags.

```tsx
import { Card } from "#patchsmith";
import type { CardProps } from "#patchsmith";

export const Example = (props: CardProps) => (
  <Card {...props}>Example content</Card>
);
```
