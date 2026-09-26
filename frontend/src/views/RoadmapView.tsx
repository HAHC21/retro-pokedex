import { useLayoutEffect } from "react";
import { useI18n } from "../i18n/context";
import { localizedRoadmap } from "../i18n/narrative";

export function RoadmapView() {
  const { locale, messages: m } = useI18n();
  const sections = localizedRoadmap(locale);
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    const frame = requestAnimationFrame(() => window.scrollTo(0, 0));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <article className="pk-page pk-roadmap">
      <header className="pk-roadmap-head">
        <p className="pk-roadmap-kicker">{m.pages.roadmapKicker}</p>
        <h1>{m.pages.roadmapTitle}</h1>
        <p>{m.pages.roadmapLead}</p>
      </header>
      {sections.map((section) => (
        <section key={section.id} className="pk-roadmap-section" id={section.id}>
          <p className="pk-roadmap-meta">{m.pages.planned}</p>
          <h2>{section.title}</h2>
          {section.intro ? <p className="pk-roadmap-intro">{section.intro}</p> : null}
          {section.features.map((feature) => (
            <div key={feature.title} className="pk-roadmap-feature">
              <h3>{feature.title}</h3>
              <p>{feature.body}</p>
              {feature.points?.length ? (
                <ul className="pk-roadmap-points">
                  {feature.points.map((point) => (
                    <li key={point.title}>
                      <strong>{point.title}.</strong> {point.body}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </section>
      ))}
    </article>
  );
}
