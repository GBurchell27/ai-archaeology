// The preview card drawn for a share link. It names the site and never a point on the earth.

import { ImageResponse } from "next/og";
import type { ShareRecord } from "./shareCatalogue";

const WIDTH = 1200;
const HEIGHT = 630;

const frame = {
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column" as const,
  justifyContent: "space-between",
  padding: "72px 80px",
  background: "#0c1016",
  color: "#f3ecdd",
  fontFamily: "Georgia, serif",
};

const eyebrow = {
  display: "flex",
  fontSize: 22,
  letterSpacing: 4,
  textTransform: "uppercase" as const,
  color: "#dba545",
};

const nameStyle = {
  display: "flex",
  marginTop: 28,
  fontSize: 68,
  lineHeight: 1.05,
  letterSpacing: -1,
};

const lineStyle = {
  display: "flex",
  marginTop: 22,
  fontSize: 28,
  color: "#c9c6bd",
};

const blurbStyle = {
  display: "flex",
  marginTop: 28,
  fontSize: 30,
  lineHeight: 1.35,
  color: "#ece4d4",
};

const footer = {
  display: "flex",
  fontSize: 22,
  letterSpacing: 1,
  color: "#98a0ab",
};

/** A named card, or the generic atlas card when the slug is not a published site. */
export function shareCardResponse(record: ShareRecord | null): ImageResponse {
  const name = record?.name ?? "Atlas of early monuments";
  const line = record?.line ?? "Published archaeological sites";
  const blurb = record?.description ?? "The atlas shows published records. It does not report a discovery.";
  return new ImageResponse(
    (
      <div style={frame}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={eyebrow}>Atlas of early monuments</div>
          <div style={nameStyle}>{name}</div>
          <div style={lineStyle}>{line}</div>
          <div style={blurbStyle}>{blurb}</div>
        </div>
        <div style={footer}>Published catalogue record</div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT },
  );
}
