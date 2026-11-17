/**
 * Elements carrying this attribute lock the pointer when clicked. Other clicks (buttons, links) do not.
 * Kept apart from the scene so the chrome can use it without loading three.js.
 * They must be in the page before the scene mounts, and stay mounted: the controls bind to them once.
 */
export const POINTER_LOCK_ATTRIBUTE = "data-walk-lock";
export const pointerLockTrigger = { [POINTER_LOCK_ATTRIBUTE]: "" };
