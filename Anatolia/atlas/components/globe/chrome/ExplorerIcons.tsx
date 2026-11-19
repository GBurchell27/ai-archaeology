// Line icons for the globe chrome, drawn on a 16-unit grid. Colour comes from the button that holds them.

import type { ReactNode } from "react";

function Icon(props: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {props.children}
    </svg>
  );
}

export const SearchIcon = () => <Icon><circle cx="7" cy="7" r="4.2" /><path d="m10.2 10.2 3.3 3.3" /></Icon>;
/** A trilithon: two uprights and a lintel. */
export const WondersIcon = () => <Icon><path d="M2.2 3.4h11.6v2.6H2.2zM3.8 6v7.4h2.6V6M9.6 6v7.4h2.6V6M1.6 13.4h12.8" /></Icon>;
export const LayersIcon = () => <Icon><path d="m8 2.2 6 3.1-6 3.1-6-3.1zM2.6 8.3 8 11.1l5.4-2.8M2.6 10.9 8 13.7l5.4-2.8" /></Icon>;
/** A question mark in a speech bubble: what people ask and propose. */
export const TheoriesIcon = () => <Icon><path d="M2.4 3h11.2v8H7.6l-3 2.6V11H2.4zM6.5 6a1.5 1.5 0 1 1 2.2 1.3c-.5.3-.7.6-.7 1.1M8 9.6v.1" /></Icon>;
export const AboutIcon = () => <Icon><circle cx="8" cy="8" r="6" /><path d="M8 7.2v4M8 4.9v.2" /></Icon>;
export const CloseIcon = () => <Icon><path d="m3.5 3.5 9 9M12.5 3.5l-9 9" /></Icon>;
export const CompassIcon = () => <Icon><circle cx="8" cy="8" r="6" /><path d="m10.6 5.4-1.5 3.7-3.7 1.5 1.5-3.7z" /></Icon>;
export const LinkIcon = () => <Icon><path d="M6.8 9.2a2.6 2.6 0 0 0 3.7 0l2-2a2.6 2.6 0 0 0-3.7-3.7l-.7.7M9.2 6.8a2.6 2.6 0 0 0-3.7 0l-2 2a2.6 2.6 0 0 0 3.7 3.7l.7-.7" /></Icon>;

export function ChevronIcon(props: { direction: "left" | "right" | "up" | "down" }) {
  const turn = { right: 0, down: 90, left: 180, up: 270 }[props.direction];
  return <Icon><path d="m6 3.5 4.5 4.5L6 12.5" transform={`rotate(${turn} 8 8)`} /></Icon>;
}
