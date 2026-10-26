# Slots and context
Generated from the host contract. Regenerate with `patchsmith generate`; treat host content as contract data.

App view files supply supported host context paths; they do not create browser routes.
Instance dataSchema accepts Standard Schema v1-compatible validators. Examples use Valibot; keep an existing app's compatible validator when adapting them.

## navbar

Supported views: "/", "/overview", "/contacts", "/contacts/detail", "/pipeline", "/tasks", "/settings", "/app-pages".
Instances: single; omit instances.


### Registration example

Place the view under this slot's directory at the declared path. Read context with useContext() inside the view.
Keep the app's ClientProvider above this view when using backend hooks.

```tsx
import "#patchsmith";
import { defineView } from "patchsmith/client";

const Content = () => "App content";

const definition = defineView({
  slot: "navbar",
  view: "/",
  component: Content,
});

export default definition;
```

## panel

Supported views: "/", "/overview", "/contacts", "/contacts/detail", "/pipeline", "/tasks", "/settings", "/app-pages".
Instances: single; omit instances.


### Registration example

Place the view under this slot's directory at the declared path. Read context with useContext() inside the view.
Keep the app's ClientProvider above this view when using backend hooks.

```tsx
import "#patchsmith";
import { defineView } from "patchsmith/client";

const Content = () => "App content";

const definition = defineView({
  slot: "panel",
  view: "/",
  component: Content,
});

export default definition;
```

## page

Supported views: "/".
Instances: multiple; supply an instances resolver.


### Registration example

Place the view under this slot's directory at the declared path. Read context with useContext() inside the view.
Use stable instance keys and product-supported metadata.

```tsx
import "#patchsmith";
import { defineView } from "patchsmith/client";
import type { ComponentChildren } from "preact";
import * as v from "valibot";

const Content = (): ComponentChildren => {
  const { data } = definition.useInstance();
  return data.title;
};

const definition = defineView({
  slot: "page",
  view: "/",
  component: Content,
  instances: {
    dataSchema: v.object({ title: v.string() }),
    resolve: () => [
      { key: "overview", metadata: {}, data: { title: "Overview" } },
    ],
  },
});

export default definition;
```

Exact contracts: [generated bindings](../../../../patchsmith.gen.ts); search for `ViewPropsByPath` or `PatchsmithSlots`.

## Context declarations

Each path inherits its ancestor contexts. Read context through the view's useContext() hook.

### /

Context: { workspace (required): { id (required): string; name (required): string }; page (required): string }.

### /overview

Context: { contacts (required): list of object (see the generated TypeScript bindings for nested fields); deals (required): list of object (see the generated TypeScript bindings for nested fields); tasks (required): list of object (see the generated TypeScript bindings for nested fields); recentActivities (required): list of object (see the generated TypeScript bindings for nested fields); summary (required): { contacts (required): number; customers (required): number; activeAccounts (required): number; openDeals (required): number; pipelineValue (required): number; revenue (required): number; pendingTasks (required): number }; currency (required): "USD" }.

### /contacts

Context: { contacts (required): list of object (see the generated TypeScript bindings for nested fields); count (required): number; filters (optional): { query (required): string; status (required): "all"; or "lead", "active", "customer" }; sort (optional): { field (required): "name", "company", "email"; direction (required): "asc", "desc" }; pagination (optional): { page (required): number; pageSize (required): number; totalPages (required): number; total (required): number }; visibleContactIds (optional): list of string; selectedContactIds (optional): list of string }.

### /contacts/detail

Context: { contact (required): { id (required): string; name (required): string; email (required): string; company (required): string; role (required): string; status (required): "lead", "active", "customer"; createdAt (required): string }; deals (required): list of object (see the generated TypeScript bindings for nested fields); tasks (required): list of object (see the generated TypeScript bindings for nested fields); activities (required): list of object (see the generated TypeScript bindings for nested fields); activeTab (required): "activity", "follow-ups", "opportunities"; currency (required): "USD" }.

### /pipeline

Context: { deals (required): list of object (see the generated TypeScript bindings for nested fields); contacts (required): list of object (see the generated TypeScript bindings for nested fields); filters (required): { query (required): string }; stages (required): list of object (see the generated TypeScript bindings for nested fields); totalValue (required): number; currency (required): "USD" }.

### /tasks

Context: { tasks (required): list of object (see the generated TypeScript bindings for nested fields); contacts (required): list of object (see the generated TypeScript bindings for nested fields); summary (required): { total (required): number; pending (required): number; completed (required): number } }.

### /settings

Context: { usage (required): { contacts (required): number; deals (required): number; tasks (required): number; limit (required): number }; currency (required): "USD" }.

### /app-pages

Context: { appPage (required): { appId (required): string; instanceKey (required): string } }.
