import { useLayoutEffect } from "react";
import { ROADMAP } from "../roadmap";

export function RoadmapView() {
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    const frame = requestAnimationFrame(() => window.scrollTo(0, 0));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <article className="pk-page pk-roadmap">
      <header className="pk-roadmap-head">
        <p className="pk-roadmap-kicker">Roadmap</p>
        <h1>What’s next</h1>
        <p>What we are building for Retro Pokédex. Shipped changes stay on the changelog.</p>
      </header>
      {ROADMAP.map((section) => (
        <section key={section.id} className="pk-roadmap-section" id={section.id}>
          <p className="pk-roadmap-meta">{section.kicker}</p>
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
