"use client";

import type { ReactNode } from "react";
import { safeExternalHref } from "@/lib/externalHref";

export function SafeLink(props: { href: string | null | undefined; children: ReactNode }) {
  const href = safeExternalHref(props.href);
  if (!href) return <span>{props.children}</span>;
  return <a href={href} target="_blank" rel="noopener noreferrer">{props.children}</a>;
}
