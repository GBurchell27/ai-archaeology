"use client";

import { useEffect, useState } from "react";
import { SafeLink } from "@/components/SafeLink";
import { safeExternalHref } from "@/lib/externalHref";
import { closeupHref, osmHref, resourceUrl, type PlaceResource } from "@/lib/placeResources";

export function PlaceResources(props: { id: string; longitude: number; latitude: number }) {
  const [record, setRecord] = useState<PlaceResource | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">("loading");
  useEffect(() => {
    let cancel = false;
    setState("loading");
    setRecord(null);
    fetch(resourceUrl(props.id))
      .then((response) => {
        if (response.status === 404) return null;
        if (!response.ok) throw new Error("resources failed");
        return response.json() as Promise<Record<string, PlaceResource>>;
      })
      .then((shard) => {
        if (cancel) return;
        const next = shard?.[props.id] ?? null;
        setRecord(next);
        setState(next ? "ready" : "missing");
      })
      .catch(() => {
        if (!cancel) setState("error");
      });
    return () => {
      cancel = true;
    };
  }, [props.id]);
  const closeup = closeupHref(props.id);
  return (
    <section className="resources" data-role="resources" data-resources={state} aria-label="Resources">
      <h2>Resources</h2>
      {state === "loading" ? <p className="muted">Loading the catalogue record…</p> : null}
      {state === "error" ? <p className="muted">The catalogue record did not load.</p> : null}
      {record?.names && record.names.length > 0 ? (
        <p data-resource="names">{record.names.join(" · ")}</p>
      ) : null}
      <ul>
        {record?.pleiadesUrl ? (
          <li><SafeLink href={record.pleiadesUrl}>Pleiades</SafeLink></li>
        ) : null}
        {(record?.wikipedia ?? []).map((article) => (
          <li key={article.lang}>
            <SafeLink href={article.url}>{article.lang === "tr" ? "Turkish Wikipedia" : "English Wikipedia"}</SafeLink>
          </li>
        ))}
        {record?.commons ? <li><SafeLink href={record.commons}>Wikimedia Commons category</SafeLink></li> : null}
        {(record?.heritage ?? []).map((item) => (
          <li key={`${item.label}-${item.url ?? ""}`}>
            {item.url ? <SafeLink href={item.url}>{item.label}</SafeLink> : item.label}
          </li>
        ))}
        {(record?.directors ?? []).map((director) => (
          <li key={director.name}>
            Excavation director {director.url ? <SafeLink href={director.url}>{director.name}</SafeLink> : director.name}
          </li>
        ))}
        {record?.website && safeExternalHref(record.website) ? <li><SafeLink href={record.website}>Official website</SafeLink></li> : null}
        <li><SafeLink href={osmHref(props.longitude, props.latitude)}>OpenStreetMap</SafeLink></li>
        {closeup ? <li><a href={closeup} data-resource="closeup">Relief close-up</a></li> : null}
      </ul>
      {record?.references && record.references.length > 0 ? (
        <ul className="citations">
          {record.references.map((reference) => (
            <li key={reference.citation}>
              {reference.url ? <SafeLink href={reference.url}>{reference.citation}</SafeLink> : reference.citation}
            </li>
          ))}
        </ul>
      ) : null}
      <p className="muted">
        {record?.pleiadesUrl ? <><SafeLink href="https://creativecommons.org/licenses/by/3.0/us/">Pleiades CC BY 3.0 US</SafeLink>. </> : null}
        {record?.wikipedia ? <><SafeLink href="https://creativecommons.org/licenses/by-sa/4.0/">Wikipedia CC BY-SA 4.0</SafeLink>. </> : null}
        <SafeLink href="https://creativecommons.org/publicdomain/zero/1.0/">Wikidata CC0</SafeLink>.
        {" "}<SafeLink href="https://www.openstreetmap.org/copyright">OpenStreetMap ODbL</SafeLink>.
      </p>
    </section>
  );
}
