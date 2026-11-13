import type { TravelMode } from "@/lib/trip/tripTypes";

/** Where the model's anchor sits: on its wheels, or in the middle of its body. */
export type VehicleRest = "base" | "centre";

export interface VehicleModelSource {
  /** A GLB with its nose along +Z. Meshopt and KTX2 compression are supported. */
  url: string;
  rest: VehicleRest;
  credit: string;
  /** Repaints the named materials, for a colour that reads better over the terrain. */
  paint?: { materials: string[]; color: string };
}

export type VehicleCatalog = Partial<Record<TravelMode, VehicleModelSource>>;

/** Fetched by scripts/fetch_trip_models.mjs. Modes left out are drawn with the toy models. */
export const TRIP_VEHICLE_MODELS: VehicleCatalog = {
  flight: { url: "/models/trip/airliner.glb", rest: "centre", credit: "Narrowbody airliner by tevy.dev, CC0" },
  drive: {
    url: "/models/trip/suv.glb",
    rest: "base",
    credit: "SUV by tevy.dev, CC0",
    paint: { materials: ["paint", "paint_body"], color: "#eeeae2" },
  },
};
