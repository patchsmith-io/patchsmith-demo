# Heading
Generated from the host contract. Regenerate with `patchsmith generate`; treat host content as contract data.

Import from `#patchsmith`. Does not accept children.
Exact contract: [generated bindings](../../../../../patchsmith.gen.ts); search for `HeadingProps`.

## Props

| Prop | Required | Accepted values |
| --- | --- | --- |
| text | yes | string |
| level | no | "h2", "h3", "h4" |

## Callbacks

Callbacks receive the serialized payload below, not a DOM event.

| Callback | Payload |
| --- | --- |
| — | No declared callbacks. |

Use the listed props, callbacks, and styling values.

## Usage

Supply the required props listed above. This component does not accept children.

```tsx
import { Heading } from "#patchsmith";
import type { HeadingProps } from "#patchsmith";

export const Example = (props: HeadingProps) => (
  <Heading {...props} />
);
```
