export function ThemeIcon(props: { night: boolean }) {
  return props.night ? (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M9.2 2.2a5.2 5.2 0 1 0 4.6 7.6A6 6 0 0 1 9.2 2.2Z" />
    </svg>
  ) : (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="2.4" />
      <path d="M8 1.6v1.6M8 12.8v1.6M1.6 8h1.6M12.8 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M12.6 3.4 11.5 4.5M4.5 11.5l-1.1 1.1" />
    </svg>
  );
}

export function SlidersIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2 4h12M2 8h12M2 12h12" />
      <circle cx="5" cy="4" r="1.3" />
      <circle cx="10" cy="8" r="1.3" />
      <circle cx="7" cy="12" r="1.3" />
    </svg>
  );
}
