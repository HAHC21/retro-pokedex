import { CHANGELOG } from "../changelog";

export function ChangelogView() {
  return (
    <article className="pk-page pk-changelog">
      <header className="pk-changelog-head">
        <p className="pk-changelog-kicker">Changelog</p>
        <h1>What’s new</h1>
        <p>Updates you can see in Retro Pokédex.</p>
      </header>
      {CHANGELOG.map((release) => (
        <section key={release.version} className="pk-changelog-release" id={`v${release.version}`}>
          <p className="pk-changelog-meta">
            {release.date}
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
