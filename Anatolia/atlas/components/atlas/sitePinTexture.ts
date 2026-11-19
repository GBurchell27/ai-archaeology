import * as THREE from "three";
import { hexToBytes } from "@/lib/globe/siteBlock";

const SIZE = 128;
const CENTRE = SIZE / 2;
/** The dark the globe's dots are rimmed with. */
const RIM = "#0d0905";
/** The globe's featured marker burns towards this at its core. */
const CORE_LIGHT = "#fff8e6";

const GLOW_STRENGTH = 0.55;

const textures = new Map<string, THREE.CanvasTexture>();

/**
 * A curated site as the globe draws a featured monument: a bright core in a halo of its colour.
 * The terrain is pale where the globe's imagery is dark, so a soft shadow and a dark rim carry the contrast.
 * `filled` false is the hollow ring of an approximate location.
 */
export function sitePinTexture(color: string, filled: boolean): THREE.CanvasTexture {
  return cachedTexture(`${color}|${filled}`, (context) => paintPin(context, color, filled));
}

/**
 * The light a curated site throws on the map around it, as the globe's featured markers do: its colour,
 * strongest at the pin and gone by the edge. Drawn with additive blending, under the pin.
 */
export function sitePinGlowTexture(color: string): THREE.CanvasTexture {
  return cachedTexture(`${color}|glow`, (context) => {
    const gradient = fade(context, color, transparent(color), 0, CENTRE);
    // Most of the light sits close to the pin, with a long faint tail.
    gradient.addColorStop(0.35, `rgba(${hexToBytes(color).join(", ")}, 0.3)`);
    // Faint enough that a cluster of sites adds up to their colour, not to white.
    context.globalAlpha = GLOW_STRENGTH;
    paintDisc(context, CENTRE, gradient);
  });
}

/** One texture per key, painted once on a square canvas. */
function cachedTexture(key: string, paint: (context: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const cached = textures.get(key);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not draw a site marker");
  paint(context);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  textures.set(key, texture);
  return texture;
}

function paintPin(context: CanvasRenderingContext2D, color: string, filled: boolean): void {
  paintDisc(context, SIZE / 2, fade(context, "rgba(4, 6, 10, 0.5)", "rgba(4, 6, 10, 0)", 22, 62));
  context.globalAlpha = 0.6;
  paintDisc(context, 50, fade(context, color, transparent(color), 24, 50));
  context.globalAlpha = 1;
  if (filled) {
    paintDisc(context, 29, RIM);
    paintDisc(context, 25, fade(context, mixHex(color, CORE_LIGHT, 0.7), color, 6, 25));
  } else {
    // A radial gradient also fills inside its inner radius; the middle of a hollow ring must stay clear.
    context.globalCompositeOperation = "destination-out";
    paintDisc(context, 20, RIM);
    context.globalCompositeOperation = "source-over";
    paintRing(context, 23, 12, RIM);
    // Lit as far as a filled pin's core, or the ring reads as a dark hole on the terrain.
    paintRing(context, 23, 7, mixHex(color, CORE_LIGHT, 0.6));
  }
}

function fade(context: CanvasRenderingContext2D, from: string, to: string, inner: number, outer: number): CanvasGradient {
  const gradient = context.createRadialGradient(CENTRE, CENTRE, inner, CENTRE, CENTRE, outer);
  gradient.addColorStop(0, from);
  gradient.addColorStop(1, to);
  return gradient;
}

function paintDisc(context: CanvasRenderingContext2D, radius: number, fill: string | CanvasGradient): void {
  context.fillStyle = fill;
  context.beginPath();
  context.arc(CENTRE, CENTRE, radius, 0, Math.PI * 2);
  context.fill();
}

function paintRing(context: CanvasRenderingContext2D, radius: number, width: number, stroke: string): void {
  context.strokeStyle = stroke;
  context.lineWidth = width;
  context.beginPath();
  context.arc(CENTRE, CENTRE, radius, 0, Math.PI * 2);
  context.stroke();
}

function transparent(hex: string): string {
  return `rgba(${hexToBytes(hex).join(", ")}, 0)`;
}

function mixHex(from: string, to: string, amount: number): string {
  const start = hexToBytes(from);
  const end = hexToBytes(to);
  return `rgb(${start.map((value, index) => Math.round(value + (end[index] - value) * amount)).join(", ")})`;
}
