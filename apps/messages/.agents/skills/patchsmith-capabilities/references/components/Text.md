# Text
Generated from the host contract. Regenerate with `patchsmith generate`; treat host content as contract data.

Import from `#patchsmith`. Does not accept children.
Exact contract: [generated bindings](../../../../../patchsmith.gen.ts); search for `TextProps`.

## Props

| Prop | Required | Accepted values |
| --- | --- | --- |
| text | yes | string |
| tone | no | "default", "muted", "success", "warning", "destructive" |
| size | no | "xs", "sm", "base", "lg" |

## Callbacks

Callbacks receive the serialized payload below, not a DOM event.

| Callback | Payload |
| --- | --- |
| — | No declared callbacks. |

Use the listed props, callbacks, and styling values.

## Usage

Supply the required props listed above. This component does not accept children.

```tsx
import { Text } from "#patchsmith";
import type { TextProps } from "#patchsmith";

export const Example = (props: TextProps) => (
  <Text {...props} />
);
```
