import { splatRecordCount } from "@/lib/walk/splatFile";

type SplatHold = {
  consumers: number;
  objectUrl: string | null;
  controller: AbortController;
  pending: Promise<string>;
};

/** One download per splat path while something is still showing it. The entry goes when the last one leaves. */
const holds = new Map<string, SplatHold>();

export type PhotographHold = {
  promise: Promise<string>;
  /** Call when this view leaves the photographs, including before the bytes have arrived. */
  release(): void;
};

/** An object URL for a splat, shared by every view that asks while the download or the URL is still in use. */
export function holdPhotograph(splatUrl: string): PhotographHold {
  const hold = holds.get(splatUrl) ?? startHold(splatUrl);
  hold.consumers += 1;
  return { promise: hold.pending, release: releaser(splatUrl, hold) };
}

/** Leaving mid-download rejects the fetch. That is not a broken file. */
export function isPhotographAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function startHold(splatUrl: string): SplatHold {
  const controller = new AbortController();
  const hold: SplatHold = { consumers: 0, objectUrl: null, controller, pending: Promise.resolve("") };
  hold.pending = loadHold(splatUrl, hold);
  holds.set(splatUrl, hold);
  return hold;
}

function loadHold(splatUrl: string, hold: SplatHold): Promise<string> {
  return objectUrlForSplat(splatUrl, hold.controller.signal).then((objectUrl) => {
    if (hold.consumers === 0 || hold.controller.signal.aborted) {
      URL.revokeObjectURL(objectUrl);
      dropHold(splatUrl, hold);
      throw abortError();
    }
    hold.objectUrl = objectUrl;
    return objectUrl;
  }, (error: unknown) => {
    dropHold(splatUrl, hold);
    throw error;
  });
}

function releaser(splatUrl: string, hold: SplatHold): () => void {
  let released = false;
  return () => {
    if (released) return;
    released = true;
    hold.consumers -= 1;
    if (hold.consumers > 0) return;
    hold.controller.abort();
    if (hold.objectUrl) URL.revokeObjectURL(hold.objectUrl);
    dropHold(splatUrl, hold);
  };
}

function dropHold(splatUrl: string, hold: SplatHold): void {
  if (holds.get(splatUrl) === hold) holds.delete(splatUrl);
}

function abortError(): DOMException {
  return new DOMException("The photograph load was aborted.", "AbortError");
}

/**
 * drei's loader throws unless the response has Content-Length. A compressed response has none: the browser strips it
 * while decompressing. These bytes are already decompressed, and a fetch of the object URL reports their real length.
 * An abort before `createObjectURL` leaves no blob behind.
 */
async function objectUrlForSplat(splatUrl: string, signal: AbortSignal): Promise<string> {
  const response = await fetch(splatUrl, { signal });
  if (!response.ok) throw new Error(`Splat file answered ${response.status}`);
  const bytes = await response.blob();
  if (signal.aborted) throw abortError();
  if (splatRecordCount(bytes.size) === null) throw new Error("Splat file was not a splat");
  return URL.createObjectURL(bytes);
}
