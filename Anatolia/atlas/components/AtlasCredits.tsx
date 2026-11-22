import { CreditLine } from "@/components/PlaceMaps";
import { SafeLink } from "@/components/SafeLink";
import type { AtlasMetadata, RegionalTerrain } from "@/lib/types";

export function AtlasCredits(props: {
  attribution: AtlasMetadata["attribution"];
  /** The region whose Sentinel credit should show, or null when none is on screen. */
  sentinelRegion: RegionalTerrain | null;
}) {
  const { attribution, sentinelRegion } = props;
  return (
    <details className="credit">
      <summary>
        <span className="credit-wide">GEM-15 · Copernicus · EOX · Pleiades</span>
        <span className="credit-phone">EOX CC BY-NC-SA 4.0 · GEM-15 CC BY 4.0 · Pleiades CC BY 3.0 · Copernicus</span>
      </summary>
      <p>
        {attribution.gem15 ? <><CreditLine text={attribution.gem15} /> </> : null}
        {attribution.dem} <CreditLine text={attribution.satellite} />
        {sentinelRegion ? <> · {sentinelRegion.sentinelCredit} · {sentinelRegion.sentinelDay}.</> : null}
        {" "}
        <SafeLink href="https://pleiades.stoa.org/">Pleiades</SafeLink>
        {" gazetteer © the contributors, "}
        <SafeLink href="https://creativecommons.org/licenses/by/3.0/us/">CC BY 3.0 US</SafeLink>.
      </p>
    </details>
  );
}
