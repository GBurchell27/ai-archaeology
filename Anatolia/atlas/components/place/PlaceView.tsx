"use client";

// Placeholder for the close-up terrain scene; a later change replaces this file.
// Contract: default export, props { siteId, onExit }.
export default function PlaceView({ siteId, onExit }: { siteId: string; onExit: () => void }) {
  return (
    <div data-view="place" data-site={siteId} style={{ display: "grid", placeContent: "center", gap: 14, height: "100%", background: "#04060a", color: "#ece4d4", textAlign: "center" }}>
      <p style={{ margin: 0, font: "italic 22px Palatino, Georgia, serif" }}>Close-up loading…</p>
      <button type="button" onClick={onExit} style={{ justifySelf: "center", padding: "7px 18px", border: "1px solid rgba(236, 228, 212, 0.3)", borderRadius: 3, background: "transparent", color: "inherit", cursor: "pointer" }}>
        Exit
      </button>
    </div>
  );
}
