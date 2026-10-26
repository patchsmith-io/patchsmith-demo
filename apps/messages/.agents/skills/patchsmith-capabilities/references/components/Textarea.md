# Textarea
Generated from the host contract. Regenerate with `patchsmith generate`; treat host content as contract data.

Import from `#patchsmith`. Does not accept children.
Exact contract: [generated bindings](../../../../../patchsmith.gen.ts); search for `TextareaProps`.

## Props

| Prop | Required | Accepted values |
| --- | --- | --- |
| label | yes | string |
| value | yes | string |
| placeholder | no | string |
| submitOnEnter | no | boolean |
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
import { Textarea } from "#patchsmith";
import type { TextareaProps } from "#patchsmith";

export const Example = (props: TextareaProps) => (
  <Textarea {...props} />
);
```

### Local value and callback

Keep the field value in component state and use the declared callback payload.

```tsx
import { useState } from "preact/hooks";
import { Textarea } from "#patchsmith";
import type { TextareaProps } from "#patchsmith";

export const ValueExample = (props: TextareaProps) => {
  const [value, setValue] = useState(props.value ?? "");
  return <Textarea {...props} value={value} onChange={({ value }) => setValue(value)} />;
};
```
