"use client";

import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import * as THREE from "three";
import { cameraCloseness, cameraDistanceToTarget, markerScale } from "@/components/atlas/cataloguePoints";
import { SELECTED_LABEL_GAP_PX, useSitePinLabels, type LabelSide, type NamedPin } from "@/components/atlas/useSitePinLabels";
import globeStyles from "@/components/globe/GlobeSites.module.css";
import { ATLAS_FOV_DEGREES, worldSizeForPixels } from "@/lib/pinCluster";

export interface SitePinMarker extends NamedPin {
  texture: THREE.Texture;
  /** The light around the pin; null for an approximate location, which stays a quiet ring as on the globe. */
  glow: THREE.Texture | null;
}

/** Pin width in CSS pixels: smaller from the country overview, where the pins stand close together. */
const PIN_PIXELS = { far: 28, near: 34, raised: 10 };
/** The glow is this many times as wide as its pin. */
const GLOW_WIDTHS = 2.3;
/** A pin standing back for a better-known neighbour, or coming forward again, fades over this long. */
const FADE_SECONDS = 0.35;
const LABEL_CLASS: Record<LabelSide, string> = {
  right: "",
  left: globeStyles.labelLeft,
  above: globeStyles.labelAbove,
  below: globeStyles.labelBelow,
};
const SELECTED_LABEL_STYLE = { "--label-gap": `${SELECTED_LABEL_GAP_PX}px` } as CSSProperties;

/** The curated sites: a glowing pin each, and the globe's serif names wherever they fit without overlapping. */
export function SitePinMarkers(props: {
  /** Most important first: that order decides which names win a crowded view. */
  pins: readonly SitePinMarker[];
  selectedId: string | null;
  /** The sites the theory open in the site panel is about: each wears the ring. It marks a subject, not a find. */
  theorySiteIds: readonly string[];
  onSelect: (siteId: string) => void;
}) {
  const { labelSides, hiddenIds } = useSitePinLabels(props.pins, props.selectedId);
  const pinPixels = usePinPixels();
  return (
    <group>
      {props.pins.map((pin) => (
        <SitePin
          key={pin.id}
          pin={pin}
          pixels={pinPixels}
          labelSide={labelSides.get(pin.id) ?? null}
          hidden={hiddenIds.has(pin.id)}
          selected={pin.id === props.selectedId}
          inTheory={props.theorySiteIds.includes(pin.id)}
          onSelect={props.onSelect}
        />
      ))}
    </group>
  );
}

/** The pin width for the camera distance and screen width. It re-renders the pins only when it changes by a pixel. */
function usePinPixels(): number {
  const [pixels, setPixels] = useState(PIN_PIXELS.near);
  useFrame(({ camera, controls, size }) => {
    const closeness = cameraCloseness(cameraDistanceToTarget(camera, controls));
    setPixels(Math.round(THREE.MathUtils.lerp(PIN_PIXELS.far, PIN_PIXELS.near, closeness) * markerScale(closeness, size.width)));
  });
  return pixels;
}

/** Fades the sprites in a group out and in, in one step under reduced motion. The frame callback idles once the fade is done. */
function useSpriteFade(shown: boolean) {
  const sprites = useRef<THREE.Group>(null);
  const opacity = useRef(shown ? 1 : 0);
  useFrame((_, delta) => {
    const group = sprites.current;
    const goal = shown ? 1 : 0;
    if (!group || (opacity.current === goal && group.visible === shown)) return;
    const step = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : delta / FADE_SECONDS;
    opacity.current = THREE.MathUtils.clamp(opacity.current + (shown ? step : -step), 0, 1);
    group.visible = opacity.current > 0;
    for (const sprite of group.children) ((sprite as THREE.Sprite).material as THREE.SpriteMaterial).opacity = opacity.current;
  });
  return sprites;
}

/** An unseen disc a little wider than the pin's core: what the pointer hovers and presses. */
function PinHitArea(props: { size: number; onPress: () => void; onHover: (hovered: boolean) => void }) {
  return (
    <sprite
      scale={[props.size, props.size, 1]}
      onClick={(event) => {
        event.stopPropagation();
        if (event.delta <= 4) props.onPress();
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        props.onHover(true);
      }}
      onPointerOut={() => props.onHover(false)}
    >
      <spriteMaterial transparent opacity={0} depthTest={false} depthWrite={false} sizeAttenuation={false} />
    </sprite>
  );
}

function SitePin(props: {
  pin: SitePinMarker;
  pixels: number;
  /** Null when the name has no free place; hovering shows it anyway. */
  labelSide: LabelSide | null;
  /** Standing back for a better-known neighbour: faded out, unnamed and not clickable until the camera comes closer. */
  hidden: boolean;
  selected: boolean;
  /** The open theory is about this site. */
  inTheory: boolean;
  onSelect: (siteId: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  useEffect(() => {
    if (props.hidden) setHovered(false);
  }, [props.hidden]);
  const sprites = useSpriteFade(!props.hidden);
  const height = useThree((state) => state.size.height);
  // The texture is half halo and shadow: the bright core is about 40% of this width.
  const raised = props.selected || hovered;
  const scale = worldSizeForPixels(1, ATLAS_FOV_DEGREES, height, props.pixels + (raised ? PIN_PIXELS.raised : 0));
  const hitSize = worldSizeForPixels(1, ATLAS_FOV_DEGREES, height, 27);
  const labelSide = props.hidden ? null : props.labelSide ?? (hovered ? "right" : null);
  return (
    <group position={props.pin.position}>
      {props.selected || (props.inTheory && !props.hidden) ? (
        <Html center zIndexRange={[2, 1]} style={{ pointerEvents: "none" }}>
          <span className={globeStyles.ring} data-role={props.selected ? "selected-site-ring" : "theory-site-ring"} data-in-theory={props.inTheory} />
        </Html>
      ) : null}
      {props.hidden ? null : <PinHitArea size={hitSize} onPress={() => props.onSelect(props.pin.id)} onHover={setHovered} />}
      <group ref={sprites}>
        {props.pin.glow ? (
          <sprite scale={[scale * GLOW_WIDTHS, scale * GLOW_WIDTHS, 1]} renderOrder={6}>
            <spriteMaterial map={props.pin.glow} transparent blending={THREE.AdditiveBlending} depthTest={false} depthWrite={false} sizeAttenuation={false} />
          </sprite>
        ) : null}
        <sprite scale={[scale, scale, 1]} renderOrder={7}>
          <spriteMaterial map={props.pin.texture} transparent depthTest={false} depthWrite={false} sizeAttenuation={false} />
        </sprite>
      </group>
      {labelSide ? (
        <Html zIndexRange={[4, 0]} style={{ pointerEvents: "none" }}>
          <span
            className={[globeStyles.label, LABEL_CLASS[labelSide], raised ? globeStyles.labelMajor : ""].join(" ")}
            style={props.selected ? SELECTED_LABEL_STYLE : undefined}
            data-role="site-pin-label"
          >
            {props.pin.name}
          </span>
        </Html>
      ) : null}
    </group>
  );
}
