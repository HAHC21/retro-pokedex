import { useEffect, useState } from "react";
import { Blueprint } from "../components/Blueprint";
import { MatchupPanel } from "../components/MatchupPanel";
import { MoveCategoryIcon } from "../components/MoveCategoryIcon";
import { PokeBallIcon } from "../components/PokeBallIcon";
import { RegionMap } from "../components/RegionMap";
import { TypeIcon } from "../components/TypeIcon";
import { TypeTag, typeTagStyle } from "../components/TypeTag";
import { STAT_LABELS, TYPE_COLORS, gamesForSpecies, type PokemonType } from "../catalog";
import {
  filterEncountersForGame,
  groupEncounters,
  regionGraphsFromEncounters,
  type WildEncounter,
} from "../encounters";
import { dexNum, navBtnStyle, pillStyle, spriteUrl, title } from "../format";
import { defensiveGroups, offensiveGroups } from "../matchups";
import { DETAIL_SECTIONS, type DetailSection } from "../paths";
import type { LearnsetGroup } from "../pokeapi";
import { entryFor, gameLabel, unionFor } from "../progress";
import type { DexIndex, MonPayload, Progress } from "../types";

type DetailViewProps = {
  id: number;
  mon: MonPayload | null;
  loading: boolean;
  spawns: WildEncounter[];
  spawnsLoading: boolean;
  learnset: LearnsetGroup[];
  learnsetLoading: boolean;
  prog: Progress;
  game: string;
  names: DexIndex["names"];
  obtainable?: boolean;
  section: DetailSection;
  onSection: (section: DetailSection) => void;
  onBack: () => void;
  onPrev: () => void;
  onNext: () => void;
  onOpen: (id: number) => void;
  onToggleCaught: (id: number) => void;
  onToggleShiny: (id: number) => void;
};

export function DetailView({
  id,
  mon,
  loading,
  spawns,
  spawnsLoading,
  learnset,
  learnsetLoading,
  prog,
  game,
  names,
  obtainable,
  section,
  onSection,
  onBack,
  onPrev,
  onNext,
  onOpen,
  onToggleCaught,
  onToggleShiny,
}: DetailViewProps) {
  const entry = entryFor(prog, game, id);
  const union = unionFor(prog, id);
  const prevId = Math.max(1, id - 1);
  const nextId = Math.min(1025, id + 1);
  const navStyle = { ...navBtnStyle(false), padding: "8px 14px", fontSize: 13 };

  return (
    <div className="pk-page pk-detail">
      <div className="pk-detail-actions">
        <button type="button" className="btn pk-nav" style={navStyle} onClick={onBack}>
          ← Back to Pokédex
        </button>
        <button type="button" className="btn pk-nav" style={navStyle} onClick={onPrev}>
          ← {dexNum(prevId)} {names[prevId] || ""}
        </button>
        <button type="button" className="btn pk-nav" style={navStyle} onClick={onNext}>
          {dexNum(nextId)} {names[nextId] || ""} →
        </button>
      </div>

      <div className="pk-detail-sections" role="tablist" aria-label="Pokémon detail sections">
        {DETAIL_SECTIONS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={section === item.id}
            className="btn pk-nav"
            style={{ ...navBtnStyle(section === item.id), padding: "8px 14px", fontSize: 13 }}
            onClick={() => onSection(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? <div className="pk-status">Loading entry…</div> : null}

      {mon ? (
        <MonBody
          mon={mon}
          entry={entry}
          game={game}
          obtainable={obtainable}
          section={section}
          spawns={spawns}
          spawnsLoading={spawnsLoading}
          learnset={learnset}
          learnsetLoading={learnsetLoading}
          recordedGames={union.where.map(gameLabel)}
          gameName={gameLabel(game)}
          onOpen={onOpen}
          onToggleCaught={() => onToggleCaught(mon.data.id)}
          onToggleShiny={() => onToggleShiny(mon.data.id)}
        />
      ) : null}
    </div>
  );
}

type MonBodyProps = {
  mon: MonPayload;
  entry: ReturnType<typeof entryFor>;
  game: string;
  obtainable?: boolean;
  section: DetailSection;
  spawns: WildEncounter[];
  spawnsLoading: boolean;
  learnset: LearnsetGroup[];
  learnsetLoading: boolean;
  recordedGames: string[];
  gameName: string;
  onOpen: (id: number) => void;
  onToggleCaught: () => void;
  onToggleShiny: () => void;
};

function MonBody({
  mon,
  entry,
  game,
  obtainable,
  section,
  spawns,
  spawnsLoading,
  learnset,
  learnsetLoading,
  recordedGames,
  gameName,
  onOpen,
  onToggleCaught,
  onToggleShiny,
}: MonBodyProps) {
  const data = mon.data;
  const species = mon.species;
  const myTypes = data.types.map((slot) => slot.type.name);
  const defense = defensiveGroups(myTypes);
  const offense = offensiveGroups(myTypes);
  const forms = (species.varieties || []).filter((item) => !item.is_default).map((item) => title(item.pokemon.name));
  const gameLines = gamesForSpecies(data.game_indices || [], species.flavor_text_entries);
  const stats = data.stats.map((stat) => ({
    label: STAT_LABELS[stat.stat.name] || title(stat.stat.name),
    value: stat.base_stat,
    pct: Math.min(100, Math.round((stat.base_stat / 180) * 100)),
  }));
  const statTotal = data.stats.reduce((sum, stat) => sum + stat.base_stat, 0);
  const gameEnc = filterEncountersForGame(spawns, game);
  const encRegions = groupEncounters(gameEnc);
  const regionMaps = regionGraphsFromEncounters(gameEnc);
  const hasSpawns = gameEnc.length > 0;
  const [mapRegionId, setMapRegionId] = useState<string | null>(null);
  const [compactSpawns, setCompactSpawns] = useState(false);
  const activeMap = regionMaps.find((graph) => graph.regionId === mapRegionId) ?? regionMaps[0] ?? null;
  const visibleEncRegions =
    !compactSpawns && activeMap
      ? encRegions.filter((region) => region.region.toLowerCase() === activeMap.label.toLowerCase())
      : encRegions;
  const showBasic = section === "home" || section === "basic";
  const showSpawns = section === "home" || section === "spawns";
  const showMoves = section === "home" || section === "moves";
  const showExtras = section === "home";
  const showGames = section === "home" || section === "basic";

  useEffect(() => {
    const media = window.matchMedia("(max-width: 900px)");
    const sync = () => setCompactSpawns(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return (
    <div className="pk-detail-body">
      {showBasic ? (
        <>
          <div className="pk-detail-row pk-detail-split pk-detail-overview">
            <div className="pk-side-stack">
              <Blueprint className="pk-identity">
                <PokeBallIcon caught={!!(entry.caught || entry.shiny)} />
                <div className="pk-identity-head">
                  <div className="pk-identity-meta">
                    <span className="tag pk-dex-box">{dexNum(data.id)}</span>
                    <div className="pk-types pk-identity-types">
                      {myTypes.map((type) => (
                        <TypeTag key={type} type={type} />
                      ))}
                    </div>
                  </div>
                  <h1>{title(data.name)}</h1>
                </div>
                <div className="pk-sprite-pair">
                  <figure>
                    <img src={spriteUrl(data.id)} alt={title(data.name)} />
                    <figcaption>Normal</figcaption>
                  </figure>
                  <figure>
                    <img src={spriteUrl(data.id, true)} alt={`${title(data.name)} shiny`} />
                    <figcaption>Shiny</figcaption>
                  </figure>
                </div>
                {obtainable === true ? (
                  <div className="pk-toggles">
                    <button type="button" className="pk-toggle" style={pillStyle(!!entry.caught, false, { fontSize: 14, padding: "9px 10px" })} onClick={onToggleCaught}>
                      {entry.caught ? "✓ Normal" : "Mark normal"}
                    </button>
                    <button type="button" className="pk-toggle" style={pillStyle(!!entry.shiny, true, { fontSize: 14, padding: "9px 10px" })} onClick={onToggleShiny}>
                      {entry.shiny ? "✓ Shiny" : "Mark shiny"}
                    </button>
                  </div>
                ) : obtainable === false ? (
                  <span className="pk-unavailable pk-unavailable-detail">Not available in {gameName}</span>
                ) : (
                  <span className="pk-unavailable pk-unavailable-detail">Checking obtainability…</span>
                )}
                <div className="pk-recorded">
                  <span>Marks in {gameName} — normal and shiny are tracked separately</span>
                  {recordedGames.length ? (
                    <div className="pk-recorded-games">
                      <span className="pk-recorded-label">Recorded in</span>
                      <span className="pk-recorded-tags">
                        {recordedGames.map((name) => (
                          <span key={name} className="tag pk-recorded-game">
                            {name}
                          </span>
                        ))}
                      </span>
                    </div>
                  ) : (
                    <span className="pk-recorded-empty">Not recorded in any game</span>
                  )}
                </div>
              </Blueprint>

              <Blueprint className="pk-evo">
                <h3>Evolution line</h3>
                <div className="pk-evo-row">
                  {mon.evo.map((step) => (
                    <button key={step.id} type="button" className="pk-nav pk-evo-cell" onClick={() => onOpen(step.id)}>
                      <img src={spriteUrl(step.id)} alt={step.name} />
                      <span>{step.name}</span>
                      <span>{step.cond}</span>
                    </button>
                  ))}
                </div>
              </Blueprint>
            </div>

            <div className="pk-side-stack">
              <Blueprint className="pk-stats">
                <h3>Base stats</h3>
                {stats.map((stat) => (
                  <div key={stat.label} className="pk-stat-row">
                    <span>{stat.label}</span>
                    <span className="pk-bar">
                      <span className="pk-bar-fill" style={{ width: `${stat.pct}%` }} />
                    </span>
                    <span>{stat.value}</span>
                  </div>
                ))}
                <div className="pk-stat-total">
                  <span>Total</span>
                  <span>{statTotal}</span>
                </div>
                <div className="pk-measure">
                  <span>Height {(data.height / 10).toFixed(1)} m</span>
                  <span>Weight {(data.weight / 10).toFixed(1)} kg</span>
                </div>
              </Blueprint>

              {showExtras && forms.length ? (
                <Blueprint className="pk-forms">
                  <h3>Alternate forms</h3>
                  <span className="pk-types">
                    {forms.map((form) => (
                      <span key={form} className="tag tag-neutral pk-form-tag">
                        {form}
                      </span>
                    ))}
                  </span>
                </Blueprint>
              ) : null}

              {showGames ? (
                <Blueprint className="pk-forms">
                  <h3>Games</h3>
                  <div className="pk-game-lines">
                    {gameLines.map((row) => (
                      <div key={row.gen} className="pk-game-line">
                        <span className="pk-game-line-gen">{row.gen}</span>
                        <span className="pk-types pk-game-line-tags">
                          {row.games.map((name) => (
                            <span key={name} className="tag tag-outline pk-form-tag">
                              {name}
                            </span>
                          ))}
                        </span>
                      </div>
                    ))}
                  </div>
                  <span className="pk-none">{gameLines.length ? "" : "PokéAPI lists no games for this Pokémon"}</span>
                </Blueprint>
              ) : null}
            </div>
          </div>

          <MatchupPanel title="Defensive matchups" groups={defense} />
          <MatchupPanel title="Offensive matchups" groups={offense} />
        </>
      ) : null}

      {showSpawns ? (
        <Blueprint className="pk-spawns">
          <div className="pk-spawn-head">
            <h3>Where it spawns</h3>
            <span>Wild encounters in {gameName}</span>
          </div>
          {spawnsLoading ? (
            <div className="pk-spawn-loading" aria-busy="true" aria-live="polite">
              <span className="pk-spawn-loading-label">Loading spawn locations…</span>
              <span className="pk-bar pk-bar-tall pk-spawn-loading-bar">
                <span className="pk-bar-fill pk-spawn-loading-fill" />
              </span>
            </div>
          ) : hasSpawns ? (
            <>
              {!compactSpawns && activeMap ? (
                <RegionMap graph={activeMap} regions={regionMaps} onSelectRegion={setMapRegionId} />
              ) : null}
              {visibleEncRegions.length ? (
                <div className="pk-enc-grid">
                  {visibleEncRegions.map((region) => (
                    <div key={region.region} className="pk-enc-col">
                      <span className="pk-enc-col-head">
                        <span className="pk-enc-region">{region.region}</span>
                        <span className="pk-enc-roman">{region.roman}</span>
                      </span>
                      <div className="pk-enc-spots">
                        {region.spots.map((spot) => (
                          <span key={spot.place} className="pk-enc-spot">
                            <span className="pk-enc-place">
                              <span>{spot.place}</span>
                              <span>{spot.games}</span>
                            </span>
                            <span className="pk-enc-rate">{spot.rate}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <p className="pk-spawn-empty">No available spawns for selected game. Please check the Games section further below.</p>
          )}
        </Blueprint>
      ) : null}

      {showMoves ? (
        <Blueprint className="pk-moves">
          <div className="pk-spawn-head">
            <h3>Moves</h3>
            <span>
              {game === "home" ? "Learnset across every game" : `Learnset in ${gameName}`}
            </span>
          </div>
          {obtainable === false ? (
            <p className="pk-spawn-empty">Not available in {gameName}.</p>
          ) : learnsetLoading ? (
            <div className="pk-spawn-loading" aria-busy="true" aria-live="polite">
              <span className="pk-spawn-loading-label">Loading moves…</span>
              <span className="pk-bar pk-bar-tall pk-spawn-loading-bar">
                <span className="pk-bar-fill pk-spawn-loading-fill" />
              </span>
            </div>
          ) : learnset.length ? (
            <div className="pk-move-groups">
              {learnset.map((group) => (
                <div key={group.method} className="pk-move-group">
                  <span className="pk-move-group-head">
                    <span className="pk-move-group-label">{group.label}</span>
                    <span className="pk-move-group-count">{group.moves.length}</span>
                  </span>
                  <div className="pk-move-list">
                    {group.moves.map((move) => {
                      const typeStyle = move.type ? typeTagStyle(move.type) : undefined;
                      const borderColor =
                        move.type && TYPE_COLORS[move.type as PokemonType]
                          ? TYPE_COLORS[move.type as PokemonType][1]
                          : "var(--color-neutral-800)";
                      return (
                        <span key={`${group.method}-${move.id}`} className="pk-move-row">
                          <span className="tag pk-move-name" style={typeStyle} title={move.type || undefined}>
                            <span className="pk-move-type-code" style={{ background: borderColor }}>
                              {move.type ? <TypeIcon type={move.type} /> : null}
                            </span>
                            <span className="pk-move-name-text">{move.name}</span>
                            <MoveCategoryIcon damageClass={move.damage_class} />
                          </span>
                          {group.method === "level-up" ? (
                            <span className="pk-move-meta">{move.level > 0 ? `Lv ${move.level}` : "Lv —"}</span>
                          ) : null}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="pk-spawn-empty">No learnset data for the selected game.</p>
          )}
        </Blueprint>
      ) : null}
    </div>
  );
}
