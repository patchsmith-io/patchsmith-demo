# Patchsmith demo — Forma CRM

A pnpm workspace. The Next.js CRM lives in `website/`; the Patchsmith apps live in `apps/messages/`, `apps/doom/`, and `apps/stripe/`.

[Patchsmith](https://patchsmith.io) powers the apps platform; Forma is the demo CRM. The workspace uses the Patchsmith SDK beta, published as `patchsmith` and `@patchsmith/*`, with the `patchsmith` CLI and `patchsmith.config.ts` configuration.

## Run locally

```sh
pnpm install
cp website/.env.example website/.env.local
pnpm --filter website db:up
pnpm --filter website db:push
pnpm dev
```

Set `PATCHSMITH_PROJECT_KEY` in `website/.env.local`; workspace setup installs the shared app ID in `apps/messages/patchsmith.config.ts`. Then open http://localhost:3000. First visit creates an anonymous Better Auth account, provisions a private workspace with 30 contacts, 18 deals, and 12 tasks, and installs Messages into the apps panel and Doom into a full-page canvas slot with a panel link. Returning visitors resume their workspace; older workspaces install missing demo apps on their next visit. Each collection permits at most 50 records; activity history keeps the latest 50 entries.

Publish Messages with `pnpm --filter @demo/messages deploy`; see [Messages](apps/messages/README.md) for the initial publish and version updates. New workspaces install the shared published app without uploading files.

Doom uses [doomgeneric](https://github.com/ozkl/doomgeneric) and the SDK canvas API. Open **App pages → Can it run DOOM?** or use the Doom panel's **Play Doom** link. The first level starts automatically; click the game to focus it. See [Doom](apps/doom/README.md) for controls and publishing.

Stripe shows persistent simulated billing in each contact's side panel, a basic empty state elsewhere, and **App pages → Stripe analytics** for workspace-wide billing analytics. Its navbar link opens a placeholder Stripe dashboard URL. Publish [Stripe](apps/stripe/README.md) first and commit the CLI-generated app ID before deploying the website; setup version 4 installs it without reseeding CRM data.

## App assets and SDK upgrades

The website and all three apps share the `patchsmith` version in `pnpm-workspace.yaml`, currently `0.1.0-beta.68`.

Put logos and other published static files in each app's `assets/` directory. The `logos` paths in `patchsmith.config.ts` are relative to that directory, such as `logo-light.svg`. Builds include those files in the hashed static asset manifest; the platform serves them at immutable URLs. App code can resolve other static files with `assetUrl("path/to/file")` from `patchsmith/client`. Each deployment supports up to 256 static files and 10 MiB of combined client, server, and static assets; each logo is limited to 256 KiB.

When upgrading from the previous logo upload format, deploy the updated platform and website host, then republish all three source apps:

```sh
pnpm --filter @demo/messages deploy --no-interactive
pnpm --filter @demo/doom deploy --no-interactive
pnpm --filter @demo/stripe deploy --no-interactive
```

Update existing installations to the newly published deployments to use the new logo URLs. Publishing alone only changes subsequent installations; existing installations remain pinned. Doom's externally hosted engine and game data remain outside the app asset bundle; together they exceed the deployment size limit.

## Checks

```sh
pnpm check
pnpm --filter website test:db
pnpm build
```

Database tests require the local Postgres container and pushed schema. They create temporary accounts and remove them on completion. Next.js handles application builds; Vite+ provides Oxlint, Oxfmt, and type-aware checking.

See [website/README.md](website/README.md) for configuration, setup versioning, and Vercel/Neon notes.
