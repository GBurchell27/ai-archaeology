/** Keyboard layout of the walk view: which keys move, and what the held keys ask for. */

export type MoveIntent = {
  /** Each axis is -1, 0 or 1. `rise` only matters when flying. */
  forward: number;
  strafe: number;
  rise: number;
  fast: boolean;
};

const FORWARD_KEYS = ["KeyW", "ArrowUp"];
const BACK_KEYS = ["KeyS", "ArrowDown"];
const LEFT_KEYS = ["KeyA", "ArrowLeft"];
const RIGHT_KEYS = ["KeyD", "ArrowRight"];
// Not Space: it would also press whichever button has the focus.
const UP_KEYS = ["KeyE"];
const DOWN_KEYS = ["KeyQ"];
const FAST_KEYS = ["ShiftLeft", "ShiftRight"];

export const MODE_KEY = "KeyF";
export const RESET_KEY = "KeyR";

export const MOVE_KEYS: ReadonlySet<string> = new Set([
  ...FORWARD_KEYS,
  ...BACK_KEYS,
  ...LEFT_KEYS,
  ...RIGHT_KEYS,
  ...UP_KEYS,
  ...DOWN_KEYS,
  ...FAST_KEYS,
]);

const held = (pressedCodes: ReadonlySet<string>, codes: string[]) => (codes.some((code) => pressedCodes.has(code)) ? 1 : 0);

export function intentFromKeys(pressedCodes: ReadonlySet<string>): MoveIntent {
  return {
    forward: held(pressedCodes, FORWARD_KEYS) - held(pressedCodes, BACK_KEYS),
    strafe: held(pressedCodes, RIGHT_KEYS) - held(pressedCodes, LEFT_KEYS),
    rise: held(pressedCodes, UP_KEYS) - held(pressedCodes, DOWN_KEYS),
    fast: held(pressedCodes, FAST_KEYS) === 1,
  };
}
