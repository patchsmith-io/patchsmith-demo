# Combobox
Generated from the host contract. Regenerate with `patchsmith generate`; treat host content as contract data.

A single searchable picker: typing filters the supplied option labels and descriptions locally in the host, without tool calls or sandbox round trips. Use for contact and other record selection instead of a separate search Input and Select. Fetch a complete, bounded option list once and pass options as { value: record.id, label: record.name, description: record.email }. value is the selected ID or null; onChange emits { value: id } on selection and { value: null } on clearing. Set loading during the initial fetch to keep the same input in place with a compact spinner; emptyMessage is shown inside the popup only after loading. clearable defaults to true; set required for mandatory selection.

Import from `#patchsmith`. Does not accept children.
Exact contract: [generated bindings](../../../../../src/patchsmith.gen.ts); search for `ComboboxProps`.

## Props

| Prop | Required | Accepted values |
| --- | --- | --- |
| label | yes | string |
| value | yes | string or null |
| options | yes | list of { label (required): string; value (required): string; description (optional): string } (maximum items: 100) |
| placeholder | no | string |
| emptyMessage | no | string |
| loading | no | boolean |
| clearable | no | boolean |
| required | no | boolean |
| disabled | no | boolean |

## Callbacks

Callbacks receive the serialized payload below, not a DOM event.

| Callback | Payload |
| --- | --- |
| onChange | { value (required): string or null } |

Use the listed props, callbacks, and styling values.

## Usage

Supply the required props listed above. This component does not accept children.

```tsx
import { Combobox } from "#patchsmith";
import type { ComboboxProps } from "#patchsmith";

export const Example = (props: ComboboxProps) => (
  <Combobox {...props} />
);
```
