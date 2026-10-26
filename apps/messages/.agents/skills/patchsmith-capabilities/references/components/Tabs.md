# Tabs
Generated from the host contract. Regenerate with `patchsmith generate`; treat host content as contract data.

Import from `#patchsmith`. Accepts children between JSX tags.
Exact contract: [generated bindings](../../../../../patchsmith.gen.ts); search for `TabsProps`.

## Props

| Prop | Required | Accepted values |
| --- | --- | --- |
| label | yes | string |
| value | yes | string |
| options | yes | list of { label (required): string; value (required): string } |

## Callbacks

Callbacks receive the serialized payload below, not a DOM event.

| Callback | Payload |
| --- | --- |
| onChange | { value (required): string } |

Use the listed props, callbacks, and styling values.

## Usage

Supply the required props listed above. Use supported children between tags.

```tsx
import { Tabs } from "#patchsmith";
import type { TabsProps } from "#patchsmith";

export const Example = (props: TabsProps) => (
  <Tabs {...props}>Example content</Tabs>
);
```

### Local value and callback

Keep the field value in component state and use the declared callback payload.

```tsx
import { useState } from "preact/hooks";
import { Tabs } from "#patchsmith";
import type { TabsProps } from "#patchsmith";

export const ValueExample = (props: TabsProps) => {
  const [value, setValue] = useState(props.value ?? "");
  return <Tabs {...props} value={value} onChange={({ value }) => setValue(value)} />;
};
```
