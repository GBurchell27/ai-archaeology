"use client";

import { Suspense } from "react";
import { GltfVehicle } from "@/components/trip/GltfVehicle";
import { ToyVehicle } from "@/components/trip/TripVehicleModels";
import { VehicleLoadBoundary } from "@/components/trip/VehicleLoadBoundary";
import { TRIP_VEHICLE_MODELS, type VehicleCatalog } from "@/lib/trip/tripVehicleCatalog";
import type { TravelMode } from "@/lib/trip/tripTypes";

/** The vehicle for a travel mode: its model from the catalogue, or the toy one while loading or if it fails. */
export function TripVehicle({ mode, catalog = TRIP_VEHICLE_MODELS }: { mode: TravelMode; catalog?: VehicleCatalog }) {
  const source = catalog[mode];
  const toy = <ToyVehicle mode={mode} />;
  if (!source) return toy;
  return (
    <VehicleLoadBoundary key={source.url} fallback={toy}>
      <Suspense fallback={toy}>
        <GltfVehicle source={source} />
      </Suspense>
    </VehicleLoadBoundary>
  );
}
