# Select
Generated from the host contract. Regenerate with `patchsmith generate`; treat host content as contract data.

Choose one value from a short fixed list. For searchable record pickers such as contacts, use Combobox instead; it combines search and selection in one input.

Import from `#patchsmith`. Does not accept children.
Exact contract: [generated bindings](../../../../../patchsmith.gen.ts); search for `SelectProps`.

## Props

| Prop | Required | Accepted values |
| --- | --- | --- |
| label | yes | string |
| value | yes | string or null |
| options | yes | list of { label (required): string; value (required): string } (maximum items: 100) |
| disabled | no | boolean |

## Callbacks

Callbacks receive the serialized payload below, not a DOM event.

| Callback | Payload |
| --- | --- |
| onChange | { value (required): string } |

Use the listed props, callbacks, and styling values.

## Usage

Supply the required props listed above. This component does not accept children.

```tsx
import { Select } from "#patchsmith";
import type { SelectProps } from "#patchsmith";

export const Example = (props: SelectProps) => (
  <Select {...props} />
);
```
