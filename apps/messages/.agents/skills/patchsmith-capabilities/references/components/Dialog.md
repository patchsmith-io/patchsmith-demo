# Dialog
Generated from the host contract. Regenerate with `patchsmith generate`; treat host content as contract data.

Displays a modal with a title and optional description. Put Cancel and Save Button children in DialogActions to keep them inline. For a modal form, place Form inside Dialog and wrap both the fields and DialogActions in that Form. Set Save to type: 'submit', handle saving in Form.onSubmit, and close Cancel through its onClick. Dialog handles the modal and onOpenChange, not form submission.

Import from `#patchsmith`. Accepts children between JSX tags.
Exact contract: [generated bindings](../../../../../patchsmith.gen.ts); search for `DialogProps`.

## Props

| Prop | Required | Accepted values |
| --- | --- | --- |
| title | yes | string |
| description | no | string |
| open | yes | boolean |

## Callbacks

Callbacks receive the serialized payload below, not a DOM event.

| Callback | Payload |
| --- | --- |
| onOpenChange | { open (required): boolean } |

Use the listed props, callbacks, and styling values.

## Usage

Supply the required props listed above. Use supported children between tags.

```tsx
import { Dialog } from "#patchsmith";
import type { DialogProps } from "#patchsmith";

export const Example = (props: DialogProps) => (
  <Dialog {...props}>Example content</Dialog>
);
```
