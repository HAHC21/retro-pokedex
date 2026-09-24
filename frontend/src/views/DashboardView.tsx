import { Blueprint } from "../components/Blueprint";
import { PkBulkImport } from "../components/PkBulkImport";
import { ProgressBar } from "../components/ProgressBar";
import { REGIONS, genById } from "../catalog";
import { dexNum, kindStyle, spriteUrl, whenText } from "../format";
import { FORM_LISTS, formListOf, type FormList } from "../forms";
import type { CatalogForm } from "../pokeapi";
import { gameLabel, unionFor, unionSets } from "../progress";
import type { DexIndex, Progress } from "../types";

type OriginBox = {
  key: string;
  title: string;
  subtitle: string;
  from: number;
  to: number;
  open: () => void;
};

function originProgressBoxes(onOpenRegion: (slug: string) => void): OriginBox[] {
  return REGIONS.map((entry) => ({
    key: entry.slug,
    title: entry.name,
    subtitle: entry.games,
    from: entry.from,
    to: entry.to,
    open: () => onOpenRegion(entry.slug),
  }));
}

const WELCOME_FEATURES = [
  {
    title: "Game selector",
    body: "Pick the save you are playing; marks, specimens, spawns, and learnsets follow that game.",
  },
  {
    title: "Pokédex & Checklist",
    body: "Browse or tick off the list with Regional, National, or generation scopes, plus missing and owned filters.",
  },
  {
    title: "Species pages",
    body: "Overviews, Pokédex entries, base stats, abilities and natures, defensive matchups, wild spawns, and recommended movesets.",
  },
  {
    title: "My Specimens",
    body: "When signed in, log multiple catches of the same species (manual or PK file upload) with ability, nature, IVs, and EVs.",
  },
];

type DashboardViewProps = {
  index: DexIndex;
  prog: Progress;
  game: string;
  gen: number;
  isStaff: boolean;
  onImported: () => void;
  onOpen: (id: number) => void;
  onOpenRegion: (slug: string) => void;
  onOpenFormList: (list: FormList) => void;
  forms: CatalogForm[];
  onOpenDex: () => void;
  onOpenMissing: () => void;
  onOpenShinies: () => void;
};

export function DashboardView({
  index,
  prog,
  game,
  gen,
  isStaff,
  onImported,
  onOpen,
  onOpenRegion,
  onOpenFormList,
  forms,
  onOpenDex,
  onOpenMissing,
  onOpenShinies,
}: DashboardViewProps) {
  const ids = Object.keys(index.names).map(Number);
  const total = ids.length || 1025;
  const { caught: uCaught, shiny: uShiny, any: uAny } = unionSets(prog);
  const caught = Object.keys(uCaught).length;
  const shiny = Object.keys(uShiny).length;
  const registered = Object.keys(uAny).length;
  const activeProg = prog[game] || {};
  const activeCaught = Object.keys(activeProg).filter((id) => activeProg[id].caught || activeProg[id].shiny).length;
  const currentGen = genById(gen);

  const kpis = [
    { label: "Registered", value: String(registered), sub: `of ${total} in the National Pokedex` },
    { label: "Completion", value: `${Math.round((registered / total) * 100)}%`, sub: `${total - registered} left to catch` },
    { label: "Shiny", value: String(shiny), sub: `${caught} tracked as normal` },
    { label: "Active game", value: String(activeCaught), sub: `Caught in ${gameLabel(game)}` },
  ];

  const events: Array<{ id: number; kind: "Normal" | "Shiny"; at: number; game: string }> = [];
  Object.entries(prog).forEach(([gk, gm]) => {
    Object.entries(gm).forEach(([id, entry]) => {
      if (entry.caught) {
        events.push({ id: Number(id), kind: "Normal", at: entry.caughtAt || 0, game: gk });
      }
      if (entry.shiny) {
        events.push({ id: Number(id), kind: "Shiny", at: entry.shinyAt || 0, game: gk });
      }
    });
  });
  events.sort((a, b) => b.at - a.at);
  const recent = events.slice(0, 6);

  return (
    <div className="pk-page pk-dash">
      <Blueprint className="pk-welcome">
        <div className="pk-welcome-head">
          <h2>Welcome to Retro Pokédex</h2>
          <span className="pk-kicker">Collection tracker · encyclopedia · spawn guide</span>
        </div>
        <p className="pk-welcome-lead">
          Retro Pokédex helps you track every Pokémon you catch across games — normals and shinies separately — then dig
          into stats, abilities, natures, spawn maps, learnsets, and recommended movesets.
        </p>
        <div className="pk-welcome-grid">
          {WELCOME_FEATURES.map((feature) => (
            <Blueprint key={feature.title} className="pk-welcome-box">
              <h3>{feature.title}</h3>
              <p>{feature.body}</p>
            </Blueprint>
          ))}
        </div>
        <p className="pk-welcome-note">
          Look for the{" "}
          <span className="pk-info-tip-btn is-static" aria-hidden="true">
            i
          </span>{" "}
          icons next to the game selector and dex filters for quick explainers.
        </p>
      </Blueprint>

      <div className="pk-kpi-grid">
        {kpis.map((kpi) => (
          <Blueprint key={kpi.label} className="pk-kpi">
            <div className="pk-kicker">{kpi.label}</div>
            <div className="pk-kpi-value">{kpi.value}</div>
            <div className="pk-kpi-sub">{kpi.sub}</div>
          </Blueprint>
        ))}
      </div>

      <PkBulkImport isStaff={isStaff} game={game} onImported={onImported} />

      <section className="pk-section">
        <div className="pk-section-head">
          <h2>Last caught</h2>
          <span>Most recent marks across every game</span>
        </div>
        {recent.length === 0 ? (
          <Blueprint className="pk-empty">Nothing marked yet — open the Pokédex to start</Blueprint>
        ) : (
          <div className="pk-recent-grid">
            {recent.map((item) => (
              <button key={`${item.game}-${item.id}-${item.kind}`} type="button" className="blueprint pk-cell pk-nav pk-recent" onClick={() => onOpen(item.id)}>
                <i className="corner tl" aria-hidden="true" />
                <i className="corner tr" aria-hidden="true" />
                <i className="corner bl" aria-hidden="true" />
                <i className="corner br" aria-hidden="true" />
                <span className="pk-recent-top">
                  <span className="pk-dex-num">{dexNum(item.id)}</span>
                  <span className="tag" style={kindStyle(item.kind)}>
                    {item.kind}
                  </span>
                </span>
                <img src={spriteUrl(item.id, item.kind === "Shiny")} alt={index.names[item.id] || `No. ${item.id}`} loading="lazy" />
                <span className="pk-name">{index.names[item.id] || `No. ${item.id}`}</span>
                <span className="pk-recent-game">{gameLabel(item.game)}</span>
                <span className="pk-when">{whenText(item.at)}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="pk-section">
        <div className="pk-section-head">
          <h2>Progress by region</h2>
          <span>Species introduced in each region</span>
        </div>
        <div className="pk-gen-grid">
          {originProgressBoxes(onOpenRegion).map((entry) => {
            let c = 0;
            let s = 0;
            for (let i = entry.from; i <= entry.to; i++) {
              if (uAny[i]) {
                c++;
              }
              if (uShiny[i]) {
                s++;
              }
            }
            const n = entry.to - entry.from + 1;
            const pct = Math.round((c / n) * 100);
            return (
              <button key={entry.key} type="button" className="blueprint pk-cell pk-nav pk-gen-box" onClick={entry.open}>
                <i className="corner tl" aria-hidden="true" />
                <i className="corner tr" aria-hidden="true" />
                <i className="corner bl" aria-hidden="true" />
                <i className="corner br" aria-hidden="true" />
                <span className="pk-gen-box-head">
                  <span className="pk-gen-region">{entry.title}</span>
                  <span className="pk-gen-roman">{entry.subtitle}</span>
                </span>
                <span className="pk-gen-pct">{pct}%</span>
                <ProgressBar pct={pct} tall />
                <span className="pk-gen-box-foot">
                  <span className="pk-gen-frac">
                    {c} / {n}
                  </span>
                  <span className="pk-gen-shiny">Shinies: {s}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="pk-section">
        <div className="pk-section-head">
          <h2>Forms</h2>
          <span>Mega Evolutions, Gigantamax, and regional forms</span>
        </div>
        <div className="pk-gen-grid">
          {FORM_LISTS.map((entry) => {
            const rows = forms.filter((form) => formListOf(form.form) === entry.id);
            const temporary = rows.length > 0 && rows.every((form) => !form.capture);
            let caught = 0;
            if (!temporary) {
              rows.forEach((form) => {
                const marks = unionFor(prog, form.pokedexId, form.form);
                if (marks.caught || marks.shiny) {
                  caught += 1;
                }
              });
            }
            const total = rows.length;
            const pct = total ? Math.round((caught / total) * 100) : 0;
            return (
              <button key={entry.id} type="button" className="blueprint pk-cell pk-nav pk-gen-box" onClick={() => onOpenFormList(entry.id)}>
                <i className="corner tl" aria-hidden="true" />
                <i className="corner tr" aria-hidden="true" />
                <i className="corner bl" aria-hidden="true" />
                <i className="corner br" aria-hidden="true" />
                <span className="pk-gen-box-head">
                  <span className="pk-gen-region">{entry.title}</span>
                  <span className="pk-gen-roman">{entry.subtitle}</span>
                </span>
                <span className="pk-gen-pct">{temporary ? total || "—" : total ? `${pct}%` : "—"}</span>
                {temporary ? null : <ProgressBar pct={pct} tall />}
                <span className="pk-gen-box-foot">
                  <span className="pk-gen-frac">{temporary ? (total ? `${total} forms` : "None stored") : `${caught} / ${total || "—"}`}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="pk-shortcut-grid">
        {[
          { title: "Pick up where I left off", body: `Open generation ${currentGen.roman}.`, go: onOpenDex },
          { title: "See what is missing", body: "Open the National Dex filtered to species with no mark yet.", go: onOpenMissing },
          { title: "My shinies", body: "Open the National Dex filtered to recorded shinies.", go: onOpenShinies },
        ].map((item) => (
          <button key={item.title} type="button" className="blueprint pk-cell pk-nav pk-shortcut" onClick={item.go}>
            <i className="corner tl" aria-hidden="true" />
            <i className="corner tr" aria-hidden="true" />
            <i className="corner bl" aria-hidden="true" />
            <i className="corner br" aria-hidden="true" />
            <span className="pk-kicker">Shortcut</span>
            <span className="pk-shortcut-title">{item.title}</span>
            <span className="pk-shortcut-body">{item.body}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
