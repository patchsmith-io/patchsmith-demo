import assert from "node:assert/strict";
import { test } from "node:test";
import { channels, encodeMessage, readMessages, type Activity } from "../../apps/messages/messages";

const activity = (description: string, overrides: Partial<Activity> = {}): Activity => ({
  id: "message-1",
  contactId: "contact-1",
  type: "note",
  title: "Note added",
  description,
  createdAt: "2026-10-16T00:00:00.000Z",
  ...overrides,
});

void test("all channels round trip through readable CRM notes, including multiline text", () => {
  for (const channel of channels) {
    const body = '  Hello!\nNext steps: <script> & "quotes" 😀  \n ';
    const note = encodeMessage(channel, body);
    assert.ok(note.startsWith(`Demo message · ${channel}\n`));
    assert.deepEqual(readMessages([activity(note)]), [
      {
        id: "message-1",
        contactId: "contact-1",
        channel,
        body,
        createdAt: "2026-10-16T00:00:00.000Z",
      },
    ]);
  }
});

void test("history ignores unrelated and malformed notes, preserves chronological order", () => {
  const valid = encodeMessage("SMS", "Checking in");
  assert.deepEqual(
    readMessages([
      activity("An ordinary CRM note"),
      activity("Demo message · Telegram\nHi"),
      activity("Demo message · Email"),
      activity("Demo message · Email\n"),
      activity(valid, { contactId: null }),
      activity(valid, { type: "task" }),
    ]),
    [],
  );
  assert.deepEqual(
    readMessages([
      activity(valid, { id: "later", createdAt: "2026-10-16T01:00:00.000Z" }),
      activity(valid, { id: "earlier" }),
    ]).map((item) => item.id),
    ["earlier", "later"],
  );
});

void test("message limits fit the host's 1000-character note limit", () => {
  assert.throws(() => encodeMessage("Email", ""));
  assert.throws(() => encodeMessage("Email", "x".repeat(801)));
  assert.throws(() => encodeMessage("Email", " ".repeat(800) + "x"));
  assert.throws(() => encodeMessage("Email", "x".repeat(800) + " "));
  assert.ok(encodeMessage("Email", "\n".repeat(400) + "x".repeat(400)).length <= 1000);
  assert.ok(encodeMessage("Slack", "x".repeat(800)).length <= 1000);
});

void test("spaces count toward the limit and survive encoding and history", () => {
  for (const body of [" ", " \n ", " ".repeat(800), " " + "x".repeat(798) + " "]) {
    const note = encodeMessage("Email", body);
    assert.equal(readMessages([activity(note)])[0].body, body);
  }
});
