# Alert
Generated from the host contract. Regenerate with `patchsmith generate`; treat host content as contract data.

Import from `#patchsmith`. Does not accept children.
Exact contract: [generated bindings](../../../../../patchsmith.gen.ts); search for `AlertProps`.

## Props

| Prop | Required | Accepted values |
| --- | --- | --- |
| title | yes | string |
| description | no | string |
| variant | no | "default", "info", "success", "warning", "error" |

## Callbacks

Callbacks receive the serialized payload below, not a DOM event.

| Callback | Payload |
| --- | --- |
| — | No declared callbacks. |

Use the listed props, callbacks, and styling values.

## Usage

Supply the required props listed above. This component does not accept children.

```tsx
import { Alert } from "#patchsmith";
import type { AlertProps } from "#patchsmith";

export const Example = (props: AlertProps) => (
  <Alert {...props} />
);
```
