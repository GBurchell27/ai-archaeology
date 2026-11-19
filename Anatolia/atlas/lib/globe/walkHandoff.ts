// Which globe card offers a walk, and where a walk's exit leads. Pure, no DOM.

import { WALK_SITES, type WalkSite } from "../walk/walkSites";

/** The walk a site id stands for: the walk of that id, or the walk a globe card of that id offers. */
export function walkSiteForCard(siteId: string | undefined): WalkSite | null {
  return WALK_SITES.find((site) => site.id === siteId || (site.globeCardIds ?? []).includes(siteId ?? "")) ?? null;
}

/** The walk the globe's site card offers for a site, or none. An Anatolian site's walk is offered by the Anatolia map. */
export function walkOfferedOnGlobe(siteId: string): WalkSite | null {
  return WALK_SITES.find((site) => (site.globeCardIds ?? []).includes(siteId)) ?? null;
}

export type WalkReturn = { view: "globe"; siteId: string } | { view: "atlas"; siteId: string };

/**
 * Where the exit of a walk leads: the view that holds the site, with the site selected. On the globe that is the card
 * the visitor came from when it is one of the site's cards (`lastGlobeCardId`), else the site's first card, which is
 * also where a walk opened directly by its address returns.
 */
export function walkReturn(site: WalkSite, lastGlobeCardId?: string): WalkReturn {
  const cardIds = site.globeCardIds ?? [];
  if (cardIds.length === 0) return { view: "atlas", siteId: site.id };
  return { view: "globe", siteId: lastGlobeCardId !== undefined && cardIds.includes(lastGlobeCardId) ? lastGlobeCardId : cardIds[0] };
}
