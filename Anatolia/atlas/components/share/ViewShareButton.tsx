"use client";

import { absoluteShareUrl, viewSharePath } from "@/lib/share/shareAddress";
import { ShareButton } from "./ShareButton";

/** Shares the view on screen. A pretty site path is copied without any query. */
export function ViewShareButton(props: { className?: string; labelClassName?: string }) {
  return (
    <ShareButton
      className={props.className}
      labelClassName={props.labelClassName}
      dataAction="share-view"
      label="Share"
      ariaLabel="Share this view"
      title="Atlas of early monuments"
      text="A view in the atlas of early monuments."
      url={() => absoluteShareUrl(window.location.origin, viewSharePath(window.location.pathname, window.location.search))}
    />
  );
}
