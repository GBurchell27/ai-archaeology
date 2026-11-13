"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { SafeLink } from "@/components/SafeLink";
import { mapsForPlace, placeLesson, readingsForPlace, type Reading } from "@/lib/placeLearning";

const sections = ["Story", "Maps", "Sources"] as const;

export function ReadingList({ entries }: { entries: readonly Reading[] }) {
  return (
    <ul className="guide-readings">
      {entries.map(({ href, title, credit, note }) => (
        <li key={href}>
          <SafeLink href={href}>{title}</SafeLink>
          <span>{credit}</span>
          <p>{note}</p>
        </li>
      ))}
    </ul>
  );
}

export function PlaceGuide(props: {
  id: string;
  name: string;
  label: string;
  meta: ReactNode;
  overview: ReactNode;
  maps: ReactNode;
  sources: ReactNode;
  related?: { id: string; name: string }[];
  onVisit?: (id: string) => void;
  onClose: () => void;
  closeAction: string;
  shown?: boolean;
  qid?: string;
}) {
  const [section, setSection] = useState<(typeof sections)[number]>("Story");
  const content = useRef<HTMLDivElement>(null);
  const lesson = placeLesson(props.id);
  const shown = props.shown ?? true;

  useEffect(() => {
    if (content.current) content.current.scrollTop = 0;
  }, [section]);

  return (
    <aside
      className={`panel place-guide${shown ? " is-in" : ""}`}
      aria-label={props.label}
      inert={!shown}
      data-wiki={props.qid}
      data-place-guide={props.id}
    >
      <header className="guide-header">
        <button type="button" className="close guide-close" data-action={props.closeAction} onClick={props.onClose}>Close</button>
        <h2>{props.name}</h2>
        {props.meta}
        <nav className="guide-tabs" aria-label="Place guide">
          {sections.map((item) => (
            <button key={item} type="button" aria-pressed={section === item} onClick={() => setSection(item)}>{item}</button>
          ))}
        </nav>
      </header>
      <div className="guide-body" ref={content} data-guide-section={section.toLowerCase()}>
        {section === "Story" ? (
          <>
            {lesson ? (
              <section className="guide-story">
                <h3>{lesson.headline}</h3>
                <p>{lesson.evidence}</p>
                <h4>How researchers read the evidence</h4>
                <p>{lesson.interpretation}</p>
                <button type="button" className="guide-text-button" onClick={() => setSection("Sources")}>Read the sources <span aria-hidden="true">→</span></button>
              </section>
            ) : null}
            <section className={lesson ? "guide-overview" : undefined}>
              {lesson ? <h3>Catalogue overview</h3> : null}
              {props.overview}
              {lesson ? null : (
                <button type="button" className="guide-text-button" onClick={() => setSection("Sources")}>Open the catalogue sources <span aria-hidden="true">→</span></button>
              )}
            </section>
            {props.related && props.related.length > 0 ? (
              <section className="guide-overview">
                <h3>{lesson ? "Continue exploring" : "Nearby published places"}</h3>
                <ul className="guide-related">
                  {props.related.map(({ id, name }) => (
                    <li key={id}><button type="button" onClick={() => props.onVisit?.(id)}>{name} <span aria-hidden="true">↗</span></button></li>
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        ) : null}
        {section === "Maps" ? (
          <>
            {lesson ? <p className="guide-map-prompt">{lesson.mapPrompt}</p> : null}
            {props.maps}
            <details className="guide-map-library">
              <summary>Historical maps and external viewers</summary>
              <ReadingList entries={mapsForPlace(props.id)} />
            </details>
          </>
        ) : null}
        {section === "Sources" ? (
          <>
            {lesson ? (
              <section>
                <h3>Excavations, research and collections</h3>
                <ReadingList entries={readingsForPlace(props.id)} />
              </section>
            ) : null}
            {props.sources}
          </>
        ) : null}
      </div>
    </aside>
  );
}
