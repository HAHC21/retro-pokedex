import { Blueprint } from "../components/Blueprint";
import { ProgressBar } from "../components/ProgressBar";
import { GAMES, GENS, gameTotal, genById } from "../catalog";
import { dexNum, kindStyle, spriteUrl, whenText } from "../format";
import { gameLabel, unionSets } from "../progress";
import type { DexIndex, Progress } from "../types";

type DashboardViewProps = {
  index: DexIndex;
  prog: Progress;
  game: string;
  gen: number;
  onOpen: (id: number) => void;
  onOpenGen: (genId: number) => void;
  onOpenGame: (gameKey: string, genId: number) => void;
  onOpenDex: () => void;
  onOpenMissing: () => void;
  onOpenShinies: () => void;
};

export function DashboardView({
  index,
  prog,
  game,
  gen,
  onOpen,
  onOpenGen,
  onOpenGame,
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

  const gameRows = GAMES.map((entry) => {
    const p = prog[entry.k] || {};
    const c = Object.keys(p).filter((id) => p[id].caught || p[id].shiny).length;
    const s = Object.keys(p).filter((id) => p[id].shiny).length;
    const n = gameTotal(entry);
    return { ...entry, caught: c, shiny: s, total: n, pct: Math.round((c / n) * 100), active: entry.k === game };
  }).filter((row) => row.active || row.caught > 0);

  return (
    <div className="pk-page pk-dash">
      <div className="pk-kpi-grid">
        {kpis.map((kpi) => (
          <Blueprint key={kpi.label} className="pk-kpi">
            <div className="pk-kicker">{kpi.label}</div>
            <div className="pk-kpi-value">{kpi.value}</div>
            <div className="pk-kpi-sub">{kpi.sub}</div>
          </Blueprint>
        ))}
      </div>

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
          <h2>Progress by generation</h2>
          <span>Registered across every game · National Dex</span>
        </div>
        <div className="pk-gen-grid">
          {GENS.map((entry) => {
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
              <button key={entry.id} type="button" className="blueprint pk-cell pk-nav pk-gen-box" onClick={() => onOpenGen(entry.id)}>
                <i className="corner tl" aria-hidden="true" />
                <i className="corner tr" aria-hidden="true" />
                <i className="corner bl" aria-hidden="true" />
                <i className="corner br" aria-hidden="true" />
                <span className="pk-gen-box-head">
                  <span className="pk-gen-region">{entry.region}</span>
                  <span className="pk-gen-roman">Gen {entry.roman}</span>
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
          <h2>Progress by game</h2>
          <span>Active game: {gameLabel(game)}</span>
        </div>
        <Blueprint className="pk-game-list">
          {gameRows.map((row) => (
            <button
              key={row.k}
              type="button"
              className={row.active ? "pk-nav pk-game-row is-active" : "pk-nav pk-game-row"}
              onClick={() => onOpenGame(row.k, row.g === 0 ? gen : row.g)}
            >
              <span className="pk-row-copy">
                <span className="pk-row-title">{row.l}</span>
                <span className="pk-row-sub">{row.g === 0 ? "National" : `${genById(row.g).region} · Gen ${genById(row.g).roman}`}</span>
              </span>
              <ProgressBar pct={row.pct} />
              <span className="pk-row-count">
                {row.caught} / {row.total}
              </span>
              <span className="pk-row-shiny">{row.shiny} shiny</span>
            </button>
          ))}
        </Blueprint>
      </section>

      <div className="pk-shortcut-grid">
        {[
          { title: "Pick up where I left off", body: `Open the current region: ${currentGen.region}.`, go: onOpenDex },
          { title: "See what is missing", body: "Filter the region to Pokemon with no mark yet.", go: onOpenMissing },
          { title: "My shinies", body: "Only the shinies recorded in this region.", go: onOpenShinies },
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
