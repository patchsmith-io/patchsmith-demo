# Input
Generated from the host contract. Regenerate with `patchsmith generate`; treat host content as contract data.

Import from `#patchsmith`. Does not accept children.
Exact contract: [generated bindings](../../../../../patchsmith.gen.ts); search for `InputProps`.

## Props

| Prop | Required | Accepted values |
| --- | --- | --- |
| label | yes | string |
| value | yes | string |
| placeholder | no | string |
| type | no | "text", "email", "password", "number", "date", "search", "url", "tel" |
| disabled | no | boolean |
| required | no | boolean |

## Callbacks

Callbacks receive the serialized payload below, not a DOM event.

| Callback | Payload |
| --- | --- |
| onChange | { value (required): string } |

Use the listed props, callbacks, and styling values.

## Usage

Supply the required props listed above. This component does not accept children.

```tsx
import { Input } from "#patchsmith";
import type { InputProps } from "#patchsmith";

export const Example = (props: InputProps) => (
  <Input {...props} />
);
```

### Local value and callback

Keep the field value in component state and use the declared callback payload.

```tsx
import { useState } from "preact/hooks";
import { Input } from "#patchsmith";
import type { InputProps } from "#patchsmith";

export const ValueExample = (props: InputProps) => {
  const [value, setValue] = useState(props.value ?? "");
  return <Input {...props} value={value} onChange={({ value }) => setValue(value)} />;
};
```
