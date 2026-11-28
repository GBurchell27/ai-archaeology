"use client";

import styles from "./CloseButton.module.css";

function CloseIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true">
      <path d="m3.5 3.5 9 9M12.5 3.5l-9 9" />
    </svg>
  );
}

/**
 * The one close control. Top-right of its panel, a 44px target, labelled "Close" plus the panel's name.
 * `placement="corner"` pins it to the panel's top-right; the panel must be positioned.
 */
export function CloseButton(props: {
  /** Spoken after "Close", so "legend" becomes "Close legend". */
  name: string;
  onClick(): void;
  /** The hook a check clicks. Panels that already had one keep it; new layers use close-layer. */
  action?: string;
  placement?: "inline" | "corner";
  className?: string;
}) {
  const placement = props.placement === "corner" ? styles.corner : "";
  const extra = props.className ?? "";
  return (
    <button
      type="button"
      className={`${styles.close} ${placement} ${extra}`.trim()}
      data-action={props.action ?? "close-layer"}
      aria-label={`Close ${props.name}`}
      onClick={props.onClick}
    >
      <CloseIcon />
    </button>
  );
}
