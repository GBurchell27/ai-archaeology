"use client";

/** Light for the vehicle models. Nothing else in the atlas uses lit materials. */
export function TripLighting() {
  return (
    <>
      <hemisphereLight args={["#fff4e2", "#6b5640", 2.4]} />
      <directionalLight position={[300_000, 600_000, 200_000]} intensity={2.2} color="#fff1dc" />
    </>
  );
}
