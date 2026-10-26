# Host tools
Generated from the host contract. Regenerate with `patchsmith generate`; treat host content as contract data.

Import tools from #patchsmith in the frontend. App actions receive only server tools through their tools capability.
Call tools directly from a callback or effect and display their result/error. They return promises, not subscriptions. For backend calls, use an action's tools capability; product credentials stay in the product.

- [tools.workspace.get](tools/workspace-get-4c4d5a8af3f5e90f.md): server operation.
- [tools.contacts.list](tools/contacts-list-cd340b43b15f40c9.md): server operation.
- [tools.contacts.get](tools/contacts-get-c3ce80b0e7ff09fb.md): server operation.
- [tools.contacts.create](tools/contacts-create-54d70d6a96d51575.md): server operation.
- [tools.contacts.update](tools/contacts-update-f42624cd620c0238.md): server operation.
- [tools.contacts.delete](tools/contacts-delete-ec2b3a05ac5e6260.md): server operation.
- [tools.deals.list](tools/deals-list-b55e5e2bc57c48cd.md): server operation.
- [tools.deals.create](tools/deals-create-5e296134f0a1a01a.md): server operation.
- [tools.deals.update](tools/deals-update-9e9015c43afac4a9.md): server operation.
- [tools.deals.delete](tools/deals-delete-b6a4adb812052d2c.md): server operation.
- [tools.deals.move](tools/deals-move-6c42d248f2b3d8ee.md): server operation.
- [tools.tasks.list](tools/tasks-list-e75ee53a7203a4fa.md): server operation.
- [tools.tasks.create](tools/tasks-create-7c0611f5eefc5ff2.md): server operation.
- [tools.tasks.update](tools/tasks-update-598206543e93b918.md): server operation.
- [tools.tasks.delete](tools/tasks-delete-424d7efbad187838.md): server operation.
- [tools.tasks.setCompleted](tools/tasks-setCompleted-e9f392c1e6fbf8bb.md): server operation.
- [tools.activities.list](tools/activities-list-d1f8b54e71f12c73.md): server operation.
- [tools.activities.addNote](tools/activities-addNote-21e90b1799d5cc2a.md): server operation.
- [tools.ui.navigate](tools/ui-navigate-a49b89e513912fe8.md): client operation.
- [tools.ui.openPanel](tools/ui-openPanel-c5c73735203c4cb1.md): client operation.
- [tools.ui.refresh](tools/ui-refresh-d181cb5e1b4fd59f.md): client operation.
- [tools.ui.setTheme](tools/ui-setTheme-7374012530431d11.md): client operation.
- [tools.ui.notify](tools/ui-notify-aae11b76263faeb6.md): client operation.
Exact contracts: [generated bindings](../../../../patchsmith.gen.ts); search for `PatchsmithTools` and `PatchsmithBackendTools`.
