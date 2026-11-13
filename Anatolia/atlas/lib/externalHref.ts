const EXACT_HOSTS = new Set([
  "whc.unesco.org",
  "doi.org",
  "zenodo.org",
  "www.naturalearthdata.com",
  "naturalearthdata.com",
  "soilgrids.org",
  "www.soilgrids.org",
  "corona.cast.uark.edu",
  "s2maps.eu",
  "www.s2maps.eu",
  "tiles.maps.eox.at",
  "creativecommons.org",
  "www.creativecommons.org",
  "pleiades.stoa.org",
  "openstreetmap.org",
  "www.openstreetmap.org",
  "commons.wikimedia.org",
  "muze.gov.tr",
  "www.muze.gov.tr",
  "jstor.org",
  "www.jstor.org",
  "zotero.org",
  "www.zotero.org",
  "topostext.org",
  "www.topostext.org",
  "www.catalhoyuk.com",
  "catalhoyuk.com",
  "pataraexcavations.org",
  "www.pataraexcavations.org",
  "sardisexpedition.org",
  "www.sardisexpedition.org",
  "www.dainst.org",
  "publications.dainst.org",
  "tastepeler.org",
  "dergipark.org.tr",
  "www.ktb.gov.tr",
  "ekitap.ktb.gov.tr",
  "gaziantep.ktb.gov.tr",
  "adiyaman.ktb.gov.tr",
  "kvmgm.ktb.gov.tr",
  "onlinelibrary.wiley.com",
  "books.ub.uni-heidelberg.de",
  "www.sanliurfa.bel.tr",
  "sanalmuze.gov.tr",
  "cayonutepesi.org.tr",
  "antiquity.ac.uk",
  "www.cambridge.org",
  "www.uniroma1.it",
  "disci.unibo.it",
  "www.orientlab.net",
  "zeugma.packhum.org",
  "zeugma.org.tr",
  "openaccess.ircica.org",
  "acikerisim.tbmm.gov.tr",
  "archives.saltresearch.org",
  "www.loc.gov",
  "www.qdl.qa",
  "maps.lib.utexas.edu",
  "magma.cnr.it",
  "www1.ku.de",
  "digitalrepository.biaa.ac.uk",
  "global-surface-water.appspot.com",
  "dataspace.copernicus.eu",
  "www.penn.museum",
  "www.persee.fr",
  "www.sciencedirect.com",
  "www.urfakulturatlasi.com.tr",
  "www.gap.gov.tr",
  "isac.uchicago.edu",
  "www.asiklihoyuk.org",
  "www.pnas.org",
  "www.liverpool.ac.uk",
  "pmc.ncbi.nlm.nih.gov",
  "repo.dainst.org",
  "www.oeaw.ac.at",
  "kups.ub.uni-koeln.de",
  "almanac.upenn.edu",
]);

const HOST_SUFFIXES = ["wikipedia.org", "wikidata.org", "noaa.gov"];

/** https URLs whose host is on the atlas allowlist. Anything else is not linked. */
export function safeExternalHref(value: string | null | undefined): string | null {
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase();
  const allowed = EXACT_HOSTS.has(host) || HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
  if (!allowed) return null;
  url.username = "";
  url.password = "";
  return url.toString();
}
