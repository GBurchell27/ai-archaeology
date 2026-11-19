// Which address writes add a browser history entry. Pure, no DOM.

export type HistoryEntry = "push" | "replace";

/**
 * A change of view (globe, atlas, place, walk) is one new entry, so Back returns to the view before.
 * Everything else rewrites the entry it is in: camera moves and selections, so Back is not filled with them,
 * and the view that Back or Forward has just landed on, whose entry already exists.
 */
export function historyEntryForView(fromView: string, toView: string, traversed: boolean): HistoryEntry {
  return traversed || fromView === toView ? "replace" : "push";
}
