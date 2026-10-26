# Skeleton
Generated from the host contract. Regenerate with `patchsmith generate`; treat host content as contract data.

Import from `#patchsmith`. Does not accept children.
Exact contract: [generated bindings](../../../../../patchsmith.gen.ts); search for `SkeletonProps`.

## Props

| Prop | Required | Accepted values |
| --- | --- | --- |
| width | no | "12", "16", "20", "24", "32", "40", "48", "full", "1/2", "2/3", "3/4" |
| height | no | "3", "4", "5", "6", "8", "10", "32", "40" |
| radius | no | "sm", "md", "lg", "full" |

## Callbacks

Callbacks receive the serialized payload below, not a DOM event.

| Callback | Payload |
| --- | --- |
| — | No declared callbacks. |

Use the listed props, callbacks, and styling values.

## Usage

Supply the required props listed above. This component does not accept children.

```tsx
import { Skeleton } from "#patchsmith";
import type { SkeletonProps } from "#patchsmith";

export const Example = (props: SkeletonProps) => (
  <Skeleton {...props} />
);
```
