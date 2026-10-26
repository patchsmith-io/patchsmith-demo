# Messages

Scaffolded with `patchsmith init`. This Preact app renders in the CRM's `panel` slot using generated host components and tools. It has no standalone web page or external messaging provider.

Open Messages from this installation's panel tab. The `/` panel view shows an inbox with three sample conversations using existing CRM contacts. Each Pressable row navigates to the contact's CRM page. The host registers `/contacts` collection context and `/contacts/detail` with that contact's full context, so Patchsmith loads the conversation view automatically. The other CRM pages have their own host views; Messages falls back to its `/` inbox on those pages. New message opens the CRM contacts list so you can choose a contact there.

Compose or reply via Email, Slack, or SMS. The recipient comes from the host view context. Sends are simulated: the app saves a readable note through `activities.addNote`, reloads sent messages through `activities.list`, and refreshes the CRM. Changing contacts resets the draft and channel selection.

Press Enter to send a message, or Shift+Enter to insert a newline.

Messages share the CRM's rolling 50-entry activity history. They disappear when those entries age out or the contact is deleted. No messages leave the demo.

From the repository root:

```sh
pnpm --filter @demo/messages build
pnpm --filter @demo/messages exec tsc --noEmit
pnpm --filter website test:messages
```

Refresh bindings against a running CRM:

```sh
pnpm --filter @demo/messages generate
```

The host URL is configured in `patchsmith.config.ts` and currently points to `https://demo.patchsmith.io/api/patchsmith`. The generated `patchsmith.gen.ts` is committed so builds don't need a running host.

Publish Messages once through the CLI against a configured host:

```sh
pnpm --filter @demo/messages deploy
```

The CLI builds, uploads, and publishes the app using the `appId` in `patchsmith.config.ts`. Workspace setup imports that config directly, so publishing and installation use the same source app. Set `PATCHSMITH_PROJECT_KEY` in the website server environment. Keep the source app in a workspace reserved for publishing; new demo workspaces receive independent installations.

To publish another version to the same source app:

```sh
pnpm --filter @demo/messages deploy --no-interactive
```

Workspace setup calls `patchsmith.experimental.installApp` with the shared app ID and the authenticated `workspace` scope. Patchsmith creates an installation pinned to the source app's published deployment without uploading assets again. Publishing a new version affects subsequent installations; existing installations keep their pinned deployment. Website dev/build commands do not build or bundle Messages. The project key is read only on the website server. Changes to the configured app ID take effect after restarting or redeploying the website.
