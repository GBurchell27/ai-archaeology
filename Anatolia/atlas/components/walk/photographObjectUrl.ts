import { splatRecordCount } from "@/lib/walk/splatFile";

/** One object URL per splat path for the life of the page, so a second visit does not download it again. */
const objectUrls = new Map<string, Promise<string>>();

/**
 * An object URL for a splat file. drei's loader throws unless the response has Content-Length, and a compressed
 * response has none: the browser strips it while decompressing. The bytes here are already decompressed, and a
 * fetch of the object URL reports their real length. The blob stays for the page, which is one extra copy of the file.
 */
export function photographObjectUrl(splatUrl: string): Promise<string> {
  const cached = objectUrls.get(splatUrl);
  if (cached) return cached;
  const pending = objectUrlForSplat(splatUrl).catch((error: unknown) => {
    objectUrls.delete(splatUrl);
    throw error;
  });
  objectUrls.set(splatUrl, pending);
  return pending;
}

async function objectUrlForSplat(splatUrl: string): Promise<string> {
  const response = await fetch(splatUrl);
  if (!response.ok) throw new Error(`Splat file answered ${response.status}`);
  const bytes = await response.blob();
  if (splatRecordCount(bytes.size) === null) throw new Error("Splat file was not a splat");
  return URL.createObjectURL(bytes);
}
