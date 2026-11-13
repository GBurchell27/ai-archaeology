"use client";

import { useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { sharedKtx2Loader } from "@/components/trip/sharedKtx2Loader";
import { sharedVehicleEnvironment } from "@/components/trip/sharedVehicleEnvironment";
import { disposeVehicleMaterials, prepareVehicleScene, VEHICLE_RENDER_ORDER } from "@/lib/trip/prepareVehicleScene";
import type { VehicleModelSource } from "@/lib/trip/tripVehicleCatalog";

/** A loaded vehicle model, one unit across, drawn over the terrain. Suspends while loading. */
export function GltfVehicle({ source }: { source: VehicleModelSource }) {
  const renderer = useThree((state) => state.gl);
  const gltf = useGLTF(source.url, false, true, (loader) => {
    loader.setKTX2Loader(sharedKtx2Loader(renderer));
  });
  const model = useMemo(
    () => prepareVehicleScene(gltf.scene, source, sharedVehicleEnvironment(renderer)),
    [gltf.scene, source, renderer],
  );
  useEffect(() => () => disposeVehicleMaterials(model), [model]);
  return (
    <group>
      <DepthReset />
      <primitive object={model} />
    </group>
  );
}

/** Clears the depth buffer just before the vehicle draws. */
function DepthReset() {
  const marker = useMemo(() => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1e-3, 1e-3),
      new THREE.MeshBasicMaterial({ colorWrite: false, depthTest: false, depthWrite: false, transparent: true }),
    );
    mesh.renderOrder = VEHICLE_RENDER_ORDER - 1;
    mesh.frustumCulled = false;
    mesh.onBeforeRender = (renderer) => {
      renderer.state.buffers.depth.setMask(true);
      renderer.clearDepth();
    };
    return mesh;
  }, []);
  useEffect(() => () => {
    marker.geometry.dispose();
    (marker.material as THREE.Material).dispose();
  }, [marker]);
  return <primitive object={marker} />;
}
