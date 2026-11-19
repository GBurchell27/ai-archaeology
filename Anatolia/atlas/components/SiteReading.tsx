"use client";

import { ReadingList } from "@/components/PlaceGuide";
import { followRowsForAtlas, followRowsForSite } from "@/lib/reading/followLinks";
import { readingRowsForSite } from "@/lib/reading/readingLists";
import type { Reading } from "@/lib/placeLearning";

/** The card it sits in supplies its own section and heading styles. */
interface SectionStyle {
  className?: string;
  headingClassName?: string;
}

function LinkSection(props: SectionStyle & { role: string; title: string; entries: readonly Reading[] }) {
  if (props.entries.length === 0) return null;
  return (
    <section className={props.className} data-role={props.role} aria-label={props.title}>
      <h3 className={props.headingClassName}>{props.title}</h3>
      <ReadingList entries={props.entries} />
    </section>
  );
}

/** The site's reading list, each work labelled by kind. Nothing for a site without one. */
export function SiteReadingList(props: SectionStyle & { siteId: string }) {
  return <LinkSection {...props} role="reading-list" title="Reading list" entries={readingRowsForSite(props.siteId)} />;
}

/** Project pages and feeds for keeping up with the site. Nothing for a site without any. */
export function SiteFollowLinks(props: SectionStyle & { siteId: string }) {
  return <LinkSection {...props} role="follow-links" title="Follow this site" entries={followRowsForSite(props.siteId)} />;
}

/** Every follow link the atlas holds, each with the site or topic it belongs to. */
export function AtlasFollowLinks(props: SectionStyle) {
  return <LinkSection {...props} role="follow-links" title="Follow" entries={followRowsForAtlas()} />;
}
