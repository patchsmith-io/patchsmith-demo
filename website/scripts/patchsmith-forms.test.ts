import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { DialogActionsProps as DoomDialogActionsProps } from "../../apps/doom/src/patchsmith.gen";
import type { DialogActionsProps as MessagesDialogActionsProps } from "../../apps/messages/src/patchsmith.gen";
import type { DialogActionsProps as StripeDialogActionsProps } from "../../apps/stripe/src/patchsmith.gen";
import { AppForm, AppDialogActions } from "../components/app-form";
import { AppSlotButton } from "../components/app/app-slot-button";
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
