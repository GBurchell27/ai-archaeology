/** One Gaussian in the `.splat` file drei reads: position, scale, colour and rotation, 32 bytes. */
export const SPLAT_RECORD_BYTES = 32;

/**
 * How many Gaussians a file of this length holds. Null when the length is empty or not a whole number of records,
 * which is what an error page or a truncated download looks like.
 */
export function splatRecordCount(byteLength: number): number | null {
  if (!Number.isInteger(byteLength) || byteLength < SPLAT_RECORD_BYTES) return null;
  if (byteLength % SPLAT_RECORD_BYTES !== 0) return null;
  return byteLength / SPLAT_RECORD_BYTES;
}
