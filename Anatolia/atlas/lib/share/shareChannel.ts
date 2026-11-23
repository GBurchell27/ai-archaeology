// Mobile uses the system share sheet. Desktop copies the link. A narrow window counts as mobile.

export function shareChannel(input: { nativeShare: boolean; coarsePointer: boolean; narrow: boolean }): "native" | "copy" {
  const mobile = input.coarsePointer || input.narrow;
  return input.nativeShare && mobile ? "native" : "copy";
}
