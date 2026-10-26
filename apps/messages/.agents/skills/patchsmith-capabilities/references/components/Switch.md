# Switch
Generated from the host contract. Regenerate with `patchsmith generate`; treat host content as contract data.

Import from `#patchsmith`. Does not accept children.
Exact contract: [generated bindings](../../../../../patchsmith.gen.ts); search for `SwitchProps`.

## Props

| Prop | Required | Accepted values |
| --- | --- | --- |
| label | yes | string |
| checked | yes | boolean |
| disabled | no | boolean |

## Callbacks

Callbacks receive the serialized payload below, not a DOM event.

| Callback | Payload |
| --- | --- |
| onCheckedChange | { checked (required): boolean } |

Use the listed props, callbacks, and styling values.

## Usage

Supply the required props listed above. This component does not accept children.

```tsx
import { Switch } from "#patchsmith";
import type { SwitchProps } from "#patchsmith";

export const Example = (props: SwitchProps) => (
  <Switch {...props} />
);
```
