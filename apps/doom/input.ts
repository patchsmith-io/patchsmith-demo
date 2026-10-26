const keyCodes: Readonly<Record<string, readonly number[]>> = {
  ArrowUp: [38],
  ArrowDown: [40],
  ArrowLeft: [37],
  ArrowRight: [39],
  KeyW: [38],
  KeyS: [40],
  // This build uses custom, unreachable defaults for dedicated strafe keys.
  // Use Doom's native Alt + arrow controls instead of comma/period.
  KeyA: [18, 37],
  KeyD: [18, 39],
  KeyF: [17],
  KeyE: [32],
  KeyP: [27],
  Space: [17],
  Enter: [13],
  ShiftLeft: [16],
  ShiftRight: [16],
  Digit1: [49],
  Digit2: [50],
  Digit3: [51],
  Digit4: [52],
  Digit5: [53],
  Digit6: [54],
  Digit7: [55],
};

export function createDoomInput(send: (keyCode: number, down: boolean) => void) {
  const held = new Map<string, readonly number[]>();
  const isHeld = (keyCode: number) => [...held.values()].some((keys) => keys.includes(keyCode));

  function key(code: string, down: boolean) {
    const keys = keyCodes[code];
    if (!keys || held.has(code) === down) return;
    if (down) {
      for (const keyCode of keys) if (!isHeld(keyCode)) send(keyCode, true);
      held.set(code, keys);
    } else {
      held.delete(code);
      // Release the direction before Alt, keeping other held aliases active.
      for (const keyCode of keys.toReversed()) if (!isHeld(keyCode)) send(keyCode, false);
    }
  }

  return {
    key,
    release: () => {
      for (const code of held.keys()) key(code, false);
    },
  };
}
