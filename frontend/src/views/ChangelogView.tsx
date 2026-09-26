import { useLayoutEffect } from "react";
import { useI18n } from "../i18n/context";
import { localizedChangelog } from "../i18n/narrative";

const MONTHS_ES: Record<string, string> = {
  Jan: "ene",
  Feb: "feb",
  Mar: "mar",
  Apr: "abr",
  May: "may",
  Jun: "jun",
  Jul: "jul",
  Aug: "ago",
  Sep: "sep",
  Oct: "oct",
  Nov: "nov",
  Dec: "dic",
};

function releaseDate(date: string, locale: string) {
  if (locale !== "es") {
    return date;
  }
  const match = /^([A-Za-z]+)\s+(\d+),\s+(\d+)$/.exec(date);
  if (!match) {
    return date;
  }
  return `${match[2]} ${MONTHS_ES[match[1]] || match[1]} ${match[3]}`;
}

export function ChangelogView() {
  const { locale, messages: m } = useI18n();
  const releases = localizedChangelog(locale);
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    const frame = requestAnimationFrame(() => window.scrollTo(0, 0));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <article className="pk-page pk-changelog">
      <header className="pk-changelog-head">
        <p className="pk-changelog-kicker">{m.pages.changelogKicker}</p>
        <h1>{m.pages.changelogTitle}</h1>
        <p>{m.pages.changelogLead}</p>
      </header>
      {releases.map((release) => (
        <section key={release.version} className="pk-changelog-release" id={`v${release.version}`}>
          <p className="pk-changelog-meta">
            {releaseDate(release.date, locale)}
            <span aria-hidden="true"> · </span>
            <span>v{release.version}</span>
          </p>
          <h2>{release.title}</h2>
          {release.intro ? <p className="pk-changelog-intro">{release.intro}</p> : null}
          {release.features.map((feature) => (
            <div key={feature.title} className="pk-changelog-feature">
              <h3>{feature.title}</h3>
              <p>{feature.body}</p>
            </div>
          ))}
        </section>
      ))}
    </article>
  );
}
