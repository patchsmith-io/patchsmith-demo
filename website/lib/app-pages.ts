import type { SlotItem } from "patchsmith/react";

type AppPage = SlotItem<true>;

export type AppPageTarget = { appSlug: string; instance: string };

function appSlug(page: AppPage) {
  // beta.70 preserves slug in view responses but omits it from PatchsmithApp's type.
  const app = page.app;
  if (
    "slug" in app &&
    typeof app.slug === "string" &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(app.slug)
  ) {
    return app.slug;
  }
  return undefined;
}

function instanceSegment(page: AppPage) {
  // Keep empty keys and URL dot segments addressable without colliding with real keys.
  if (!page.key) return `~${page.app.id.slice(0, 8)}`;
  return page.key === "." || page.key === ".." || page.key.startsWith("~")
    ? `~${page.key}`
    : page.key;
}

export function appPageHref(page: AppPage) {
  const slug = appSlug(page);
  if (!slug) throw new Error("The installed app is missing its platform slug.");
  return `/apps/${encodeURIComponent(slug)}/${encodeURIComponent(instanceSegment(page))}`;
}

export function findAppPage(pages: AppPage[], target: AppPageTarget) {
  const matches = pages.filter(
    (page) => appSlug(page) === target.appSlug && instanceSegment(page) === target.instance,
  );
  return matches.length === 1 ? matches[0] : undefined;
}

export function installedAppPageHref(
  pages: AppPage[],
  installationId: string,
  instanceKey: string,
) {
  const matches = pages.filter(
    (page) => page.app.id === installationId && page.key === instanceKey,
  );
  if (matches.length !== 1) throw new Error("The installed app page is unavailable.");
  return appPageHref(matches[0]);
}

export function appPageLabel(page: SlotItem<true>) {
  const label = page.metadata.label;
  return typeof label === "string" && label.trim()
    ? label.trim()
    : `${page.app.name ?? page.app.id} · ${page.key}`;
}
