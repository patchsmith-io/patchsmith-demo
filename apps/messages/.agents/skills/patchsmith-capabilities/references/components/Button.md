# Button
Generated from the host contract. Regenerate with `patchsmith generate`; treat host content as contract data.

Import from `#patchsmith`. Does not accept children.
Exact contract: [generated bindings](../../../../../src/patchsmith.gen.ts); search for `ButtonProps`.

## Props

| Prop | Required | Accepted values |
| --- | --- | --- |
| label | yes | string |
| variant | no | "default", "outline", "secondary", "ghost", "destructive", "destructive-outline", "link" |
| size | no | "xs", "sm", "default", "lg" |
| disabled | no | boolean |
| href | no | string |
| type | no | "button", "submit", "reset" |

## Callbacks

Callbacks receive the serialized payload below, not a DOM event.

| Callback | Payload |
| --- | --- |
| onClick | no payload |

Use the listed props, callbacks, and styling values.

## Usage

Supply the required props listed above. This component does not accept children.

```tsx
import { Button } from "#patchsmith";
import type { ButtonProps } from "#patchsmith";

export const Example = (props: ButtonProps) => (
  <Button {...props} />
);
```
