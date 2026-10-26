import { expect, test } from "vite-plus/test";
import { createDoomInput } from "./input";

function setup() {
  const events: [number, boolean][] = [];
  const input = createDoomInput((code, down) => events.push([code, down]));
  return { ...input, events };
}

test("A/D strafe with Alt + arrows and keep Alt held until both are released", () => {
  const input = setup();
  input.key("KeyA", true);
  input.key("KeyA", true);
  input.key("KeyD", true);
  input.key("KeyA", false);
  input.key("KeyD", false);
  expect(input.events).toEqual([
    [18, true],
    [37, true],
    [39, true],
    [37, false],
    [39, false],
    [18, false],
  ]);
});

test("releasing strafe preserves a held arrow, then restores turning", () => {
  const input = setup();
  input.key("ArrowLeft", true);
  input.key("KeyA", true);
  input.key("KeyA", false);
  input.key("ArrowLeft", false);
  expect(input.events).toEqual([
    [37, true],
    [18, true],
    [18, false],
    [37, false],
  ]);
});

test("blur/pause cleanup releases every key, including shared movement and fire aliases", () => {
  const input = setup();
  for (const code of ["KeyW", "ArrowUp", "KeyD", "Space", "KeyF", "ShiftLeft", "ShiftRight"])
    input.key(code, true);
  input.release();
  input.release();
  input.key("KeyF", false);
  input.key("Tab", true);
  expect(input.events).toEqual([
    [38, true],
    [18, true],
    [39, true],
    [17, true],
    [16, true],
    [38, false],
    [39, false],
    [18, false],
    [17, false],
    [16, false],
  ]);
});
