# Badge
Generated from the host contract. Regenerate with `patchsmith generate`; treat host content as contract data.

Import from `#patchsmith`. Does not accept children.
Exact contract: [generated bindings](../../../../../patchsmith.gen.ts); search for `BadgeProps`.

## Props

| Prop | Required | Accepted values |
| --- | --- | --- |
| text | yes | string |
| variant | no | "default", "secondary", "outline", "info", "success", "warning", "error", "destructive" |

## Callbacks

Callbacks receive the serialized payload below, not a DOM event.

| Callback | Payload |
| --- | --- |
| — | No declared callbacks. |

Use the listed props, callbacks, and styling values.

## Usage

Supply the required props listed above. This component does not accept children.

```tsx
import { Badge } from "#patchsmith";
import type { BadgeProps } from "#patchsmith";

export const Example = (props: BadgeProps) => (
  <Badge {...props} />
);
```
