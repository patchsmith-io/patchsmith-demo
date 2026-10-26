import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { DialogActionsProps as DoomDialogActionsProps } from "../../apps/doom/patchsmith.gen";
import type { DialogActionsProps as MessagesDialogActionsProps } from "../../apps/messages/patchsmith.gen";
import type { DialogActionsProps as StripeDialogActionsProps } from "../../apps/stripe/patchsmith.gen";
import type { ComboboxProps as DoomComboboxProps } from "../../apps/doom/patchsmith.gen";
import type { ComboboxProps as MessagesComboboxProps } from "../../apps/messages/patchsmith.gen";
import type { ComboboxProps as StripeComboboxProps } from "../../apps/stripe/patchsmith.gen";
import { AppForm, AppDialogActions } from "../components/app-form";
import { AppSlotButton } from "../components/app/app-slot-button";
import { AppSlotCombobox } from "../components/app/app-slot-combobox";
import { contract } from "../lib/patchsmith";

void test("forms leave layout and submission controls to their caller", () => {
  const props = contract.components.Form.fields.parse({});
  const empty = renderToStaticMarkup(createElement(AppForm, props, "Fields"));
  assert.equal(empty, "<form>Fields</form>");
  const explicit = renderToStaticMarkup(
    createElement(AppForm, props, createElement("button", { type: "submit" }, "Send")),
  );
  assert.equal((explicit.match(/<button\b/g) ?? []).length, 1);
  assert.match(explicit, />Send<\/button>/);
});

void test("dialog actions compose inside a form without adding submission controls", () => {
  const actions = createElement(
    AppDialogActions,
    null,
    createElement(AppSlotButton, { label: "Cancel" }),
    createElement(AppSlotButton, { label: "Save follow-up", type: "submit" }),
  );
  const html = renderToStaticMarkup(
    createElement(AppForm, {}, createElement("input", { required: true }), actions),
  );
  assert.equal((html.match(/<form\b/g) ?? []).length, 1);
  assert.equal((html.match(/<button\b/g) ?? []).length, 2);
  assert.match(html, /<button[^>]*type="button"[^>]*>Cancel<\/button>/);
  assert.match(html, /<button[^>]*type="submit"[^>]*>Save follow-up<\/button>/);
  assert.match(html, /<form>.*<input.*data-slot="dialog-footer".*Save follow-up.*<\/form>/);
  assert.match(html, /flex-row/);
  assert.match(html, /justify-end/);
});

void test("every generated binding exposes composable dialog actions", () => {
  const actions = {} satisfies ComponentProps<typeof AppDialogActions>;
  const generated: [DoomDialogActionsProps, MessagesDialogActionsProps, StripeDialogActionsProps] =
    [actions, actions, actions];
  for (const props of generated) {
    assert.equal(contract.components.DialogActions.fields.safeParse(props).success, true);
  }
  assert.equal(contract.components.DialogActions.children, true);
  assert.equal("onSubmit" in contract.components.Dialog.callbacks, false);
});

void test("contact pickers accept the complete demo list and serialize clearing as null", async () => {
  const props = {
    label: "CRM contact",
    value: null,
    loading: true,
    clearable: true,
    required: false,
    options: Array.from({ length: 50 }, (_, index) => ({
      value: `contact-${index}`,
      label: `Contact ${index}`,
      description: `contact-${index}@example.com`,
    })),
    onChange: ({ value }: { value: string | null }) => {
      assert.ok(value === null || typeof value === "string");
    },
  };
  const generated: [DoomComboboxProps, MessagesComboboxProps, StripeComboboxProps] = [
    props,
    props,
    props,
  ];
  for (const binding of generated) {
    assert.equal(contract.components.Combobox.fields.safeParse(binding).success, true);
    await binding.onChange?.({ value: null });
  }
  const change = contract.components.Combobox.callbacks.onChange.input;
  assert.deepEqual(change.parse({ value: null }), { value: null });
  assert.deepEqual(change.parse({ value: "contact-49" }), { value: "contact-49" });
  assert.equal(change.safeParse({ value: 49 }).success, false);
});

void test("loading contact pickers keep their labeled input and omit premature empty feedback", () => {
  const props = { label: "CRM contact", value: null, options: [], required: true };
  const loading = renderToStaticMarkup(createElement(AppSlotCombobox, { ...props, loading: true }));
  const ready = renderToStaticMarkup(createElement(AppSlotCombobox, props));
  for (const html of [loading, ready]) {
    const inputId = /<input[^>]*id="([^"]+)"/.exec(html)?.[1];
    assert.ok(inputId);
    assert.ok(html.includes(`for="${inputId}"`));
    assert.match(html, /role="combobox"/);
    assert.doesNotMatch(html, /No results found/);
  }
  assert.match(loading, /aria-busy="true"/);
  assert.match(loading, /Loading crm contact options/);
  assert.match(loading, /<input[^>]*disabled=""/);
  assert.doesNotMatch(ready, /aria-busy="true"/);
});

void test("loading preserves required picker validation unless explicitly disabled", () => {
  for (const loading of [false, true]) {
    for (const disabled of [false, true]) {
      const html = renderToStaticMarkup(
        createElement(AppSlotCombobox, {
          label: "Required choice",
          value: null,
          options: [],
          required: true,
          loading,
          disabled,
        }),
      );
      const validationInput = html
        .match(/<input\b[^>]*>/g)
        ?.find((input) => /\brequired=""/.test(input));
      assert.ok(validationInput, "The picker must retain its required validation input");
      assert.equal(/\bdisabled=""/.test(validationInput), disabled);
      assert.doesNotMatch(validationInput, /\breadonly=""/i);
    }
  }
});
