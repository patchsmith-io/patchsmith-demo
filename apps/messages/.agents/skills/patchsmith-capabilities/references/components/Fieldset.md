# Fieldset
Generated from the host contract. Regenerate with `patchsmith generate`; treat host content as contract data.

Import from `#patchsmith`. Accepts children between JSX tags.
Exact contract: [generated bindings](../../../../../patchsmith.gen.ts); search for `FieldsetProps`.

## Props

| Prop | Required | Accepted values |
| --- | --- | --- |
| legend | no | string |
| disabled | no | boolean |

## Callbacks

Callbacks receive the serialized payload below, not a DOM event.

| Callback | Payload |
| --- | --- |
| — | No declared callbacks. |

Use the listed props, callbacks, and styling values.

## Usage

Supply the required props listed above. Use supported children between tags.

```tsx
import { Fieldset } from "#patchsmith";
import type { FieldsetProps } from "#patchsmith";

export const Example = (props: FieldsetProps) => (
  <Fieldset {...props}>Example content</Fieldset>
);
```
