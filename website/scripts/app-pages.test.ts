import assert from "node:assert/strict";
import { test } from "node:test";
import type { SlotItem } from "patchsmith/react";
import { appPageHref, findAppPage, installedAppPageHref } from "../lib/app-pages";
import { contract } from "../lib/patchsmith";

const page = (id: string, slug = "doom", key = "doom", name = "Doom") =>
  ({
    app: { id, name, slug },
    key,
    metadata: {},
    data: {},
  }) satisfies SlotItem<true> & { app: { slug: string } };

void test("URLs use the platform slug and actual instance key, never the display name", () => {
  const doom = page("workspace-installation", "doom-2");
  assert.equal(appPageHref(doom), "/apps/doom-2/doom");
  assert.equal(findAppPage([doom], { appSlug: "doom-2", instance: "doom" }), doom);
  assert.equal(findAppPage([doom], { appSlug: "doom", instance: "doom" }), undefined);
  assert.equal(findAppPage([doom], { appSlug: "doom-2", instance: "missing" }), undefined);
  assert.equal(
    appPageHref({ ...doom, app: { ...doom.app, name: "Renamed game" } }),
    appPageHref(doom),
  );
});

void test("instance keys remain intact through URL encoding", () => {
  for (const key of ["weekly report", "a/b?c#d", "你好", ".", "..", "~default", ""]) {
    const item = page("installation-123", "reports-2", key, "Café Reports!");
    const url = new URL(appPageHref(item), "https://demo.patchsmith.io");
    const [, , appSlug, instance] = url.pathname.split("/").map(decodeURIComponent);
    assert.equal(appSlug, "reports-2");
    assert.equal(findAppPage([item], { appSlug, instance }), item);
  }
});

void test("same-named apps retain their URLs when another installation appears", () => {
  const first = page("12345678-a", "doom");
  const second = page("12345678-b", "doom-2");
  const anotherInstance = page(first.app.id, "doom", "second");
  const pages = [first, second, anotherInstance];
  for (const item of pages) {
    const [, , appSlug, instance] = appPageHref(item).split("/").map(decodeURIComponent);
    assert.equal(findAppPage(pages, { appSlug, instance }), item);
  }
  assert.equal(findAppPage(pages, { appSlug: "doom", instance: "doom" }), first);
  assert.equal(findAppPage([first, first], { appSlug: "doom", instance: "doom" }), undefined);
});

void test("missing or invalid platform slugs cannot become display-name aliases", () => {
  for (const slug of [undefined, "", "../doom", "Doom"]) {
    const item = { ...page("installation"), app: { id: "installation", name: "Doom", slug } };
    assert.throws(() => appPageHref(item), /platform slug/);
    assert.equal(findAppPage([item], { appSlug: "doom", instance: "doom" }), undefined);
  }
});

void test("app-owned navigation resolves the caller's installation and exact page key", () => {
  const first = page("first-installation", "doom");
  const second = page("second-installation", "doom-2");
  const pages = [first, second];
  assert.equal(installedAppPageHref(pages, second.app.id, "doom"), "/apps/doom-2/doom");
  assert.throws(() => installedAppPageHref(pages, "uninstalled", "doom"), /unavailable/);
  assert.throws(() => installedAppPageHref(pages, first.app.id, "missing"), /unavailable/);
});

void test("app navigation accepts readable paths and rejects old or unsafe destinations", () => {
  const input = contract.tools.ui.navigate.definition.input;
  assert.ok(input);
  for (const href of [
    "/apps/doom/doom",
    "/apps/reports/weekly%20report",
    "/apps/reports/a%2Fb%3Fc%23d",
    "/contacts/contact-1",
  ]) {
    assert.equal(input.safeParse({ href }).success, true, href);
  }
  for (const href of [
    "/app-pages/installation-1?instance=doom",
    "https://example.com/apps/doom/doom",
    "//example.com/apps/doom/doom",
    "/apps/doom",
    "/apps/doom/doom/extra",
    "/apps/../doom",
    "/apps/doom/%2e%2e",
    "/apps/doom/doom?redirect=https://example.com",
    "/apps/doom/doom#fragment",
  ]) {
    assert.equal(input.safeParse({ href }).success, false, href);
  }
});
