/** Why a 3D view stopped, as far as the thrown value says. */
export type SceneFailureKind = "webgl" | "memory" | "file" | "unknown";

export type SceneLoadFailure = {
  kind: SceneFailureKind;
  /** The message the browser or the loader gave, which may be empty. */
  reported: string;
};

/** The text of a thrown string or Error. Anything else is empty: the kind is then unknown. */
export function sceneFailureText(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  return "";
}

/** Reads a thrown value. WebGL and memory are named; a bad splat response is a file; the rest is unknown. */
export function sceneFailureKind(error: unknown): SceneFailureKind {
  const text = sceneFailureText(error).toLowerCase();
  if (text.includes("webgl") || text.includes("context lost") || text.includes("lost context")) return "webgl";
  if (text.includes("out of memory") || text.includes("allocation") || text.includes("array buffer")) return "memory";
  if (isFileFailure(text)) return "file";
  return "unknown";
}

function isFileFailure(text: string): boolean {
  if (text.includes("answered ") || text.includes("not a splat") || text.includes("content length")) return true;
  return text.includes("could not load") && text.includes("splat");
}

/**
 * A photograph that answered 404 is missing, the same as a splat that was never built.
 * Any other throw is a failure the view can explain.
 */
export function viewLoadFailure(error: unknown): "missing" | SceneLoadFailure {
  const reported = sceneFailureText(error);
  if (reported.toLowerCase().includes("answered 404")) return "missing";
  return { kind: sceneFailureKind(error), reported };
}

/** The sentence the notice leads with. It names the kind and does not guess a cause past it. */
export function sceneFailureLead(kind: SceneFailureKind): string {
  if (kind === "webgl") return "This view needs WebGL, and this browser could not start it.";
  if (kind === "memory") return "This view ran out of memory on this device.";
  if (kind === "file") return "The file for this view could not be read.";
  return "This view stopped on an unexpected error.";
}
