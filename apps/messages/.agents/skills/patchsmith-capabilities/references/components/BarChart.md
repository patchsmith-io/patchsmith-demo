# BarChart
Generated from the host contract. Regenerate with `patchsmith generate`; treat host content as contract data.

Import from `#patchsmith`. Does not accept children.
Exact contract: [generated bindings](../../../../../patchsmith.gen.ts); search for `BarChartProps`.

## Props

| Prop | Required | Accepted values |
| --- | --- | --- |
| label | yes | string |
| data | yes | list of { label (required): string; value (required): number } |
| valueLabel | no | string |
| valueFormat | no | "number", "currency" |
| currency | no | string |

## Callbacks

Callbacks receive the serialized payload below, not a DOM event.

| Callback | Payload |
| --- | --- |
| — | No declared callbacks. |

Use the listed props, callbacks, and styling values.

## Usage

Supply the required props listed above. This component does not accept children.

```tsx
import { BarChart } from "#patchsmith";
import type { BarChartProps } from "#patchsmith";

export const Example = (props: BarChartProps) => (
  <BarChart {...props} />
);
```
