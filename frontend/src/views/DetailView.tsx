import { useEffect, useState } from "react";
import { isStaffRole, type AuthUser } from "../auth";
import { Blueprint } from "../components/Blueprint";
import { InfoTip } from "../components/InfoTip";
import { boxClass, rarityLabel, rarityNote } from "../rarity";
import { MatchupPanel } from "../components/MatchupPanel";
import { MoveNameTag } from "../components/MoveNameTag";
import { OwnedCollectionPanel } from "../components/OwnedCollectionPanel";
import { PokeBallIcon } from "../components/PokeBallIcon";
import { GenderSprites } from "../components/GenderSprites";
import { MarkToggles } from "../components/MarkToggles";
import { SpriteImage } from "../components/PokemonSprite";
import { RegionMap } from "../components/RegionMap";
import { TypeTag } from "../components/TypeTag";
import { GameTag } from "../components/GameTag";
import { STAT_LABELS, gamesFromAvailability, versionLabel, versionsForGame } from "../catalog";
import {
  filterEncountersForGame,
  groupEncounters,
  regionGraphsFromEncounters,
  type WildEncounter,
} from "../encounters";
import { dexNum, navBtnStyle, spriteUrl, title } from "../format";
import {
  formDisplayName,
  formIsCapturable,
  formsEqual,
  isCosmeticForm,
  speciesFormEntries,
  type SpeciesForm,
  type SpeciesFormEntry,
} from "../forms";
import { defensiveGroups, offensiveGroups } from "../matchups";
import { NATURES, natureModifierLabel } from "../natures";
import { baseStatsFromPokeApi } from "../ownedStats";
import { DETAIL_SECTIONS, type DetailSection, type ListView } from "../paths";
import {
  fetchAiMovesets,
  fetchSmogonMovesets,
  refreshAiMovesets,
  type AiMovesetsPayload,
  type LearnsetGroup,
  type MovesetCard,
  type SmogonMovesetsPayload,
} from "../pokeapi";
import { fetchOwnedPokemon } from "../collectionApi";
import { gameLabel, unionFor, type GenderChoice } from "../progress";
import type { DexIndex, MarkKey, MonPayload, Progress } from "../types";

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
  rarity: DexIndex["rarity"];
  obtainable?: boolean;
  authUser?: AuthUser | null;
  section: DetailSection;
  listView?: ListView;
  onSection: (section: DetailSection) => void;
  onBack: () => void;
  onPrev: () => void;
  onNext: () => void;
  form: SpeciesForm | null;
  onOpen: (id: number) => void;
  onOpenForm: (id: number, form: SpeciesForm | null) => void;
  onToggleCaught: (id: number) => void;
  onToggleShiny: (id: number) => void;
  onToggleGender: (id: number, key: MarkKey, gender: GenderChoice) => void;
  onProgressRefresh?: () => void;
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
  rarity,
  obtainable,
  authUser = null,
  section,
  listView = "dex",
  onSection,
  onBack,
  onPrev,
  onNext,
  form,
  onOpen,
  onOpenForm,
  onToggleCaught,
  onToggleShiny,
  onToggleGender,
  onProgressRefresh,
}: DetailViewProps) {
  const marks = unionFor(prog, id, form);
  const prevId = Math.max(1, id - 1);
  const nextId = Math.min(1025, id + 1);
  const navStyle = { ...navBtnStyle(false), padding: "8px 14px", fontSize: 13 };

  return (
    <div className="pk-page pk-detail">
      <div className="pk-detail-actions">
        <button type="button" className="btn pk-nav" style={navStyle} onClick={onBack}>
          ← Back to {listView === "checklist" ? "Checklist" : "Pokédex"}
        </button>
        <button type="button" className="btn pk-nav" style={navStyle} onClick={onPrev}>
          ← {dexNum(prevId)} {names[prevId] || ""}
        </button>
        <span className="btn pk-nav pk-current-entry" style={{ ...navBtnStyle(true), padding: "8px 14px", fontSize: 13 }}>
          {dexNum(id)} {form ? formDisplayName(names[id] || "", form) : names[id] || ""}
        </span>
        <button type="button" className="btn pk-nav" style={navStyle} onClick={onNext}>
          {dexNum(nextId)} {names[nextId] || ""} →
        </button>
      </div>

      {mon?.capture === false ? null : (
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
      )}

      {loading ? <div className="pk-status">Loading entry…</div> : null}

      {mon ? (
        <MonBody
          mon={mon}
          marks={marks}
          game={game}
          obtainable={obtainable}
          section={mon.capture === false ? "home" : section}
          spawns={spawns}
          spawnsLoading={spawnsLoading}
          learnset={learnset}
          learnsetLoading={learnsetLoading}
          recordedGames={marks.where.map(gameLabel)}
          gameName={gameLabel(game)}
          displayName={form ? formDisplayName(speciesDisplayName(names, id, mon), form) : speciesDisplayName(names, id, mon)}
          speciesName={speciesDisplayName(names, id, mon)}
          speciesId={id}
          rarity={rarity[id]}
          form={form}
          prog={prog}
          canRefreshAi={isStaffRole(authUser?.role)}
          signedIn={!!authUser}
          onProgressRefresh={onProgressRefresh}
          onOpen={onOpen}
          onOpenForm={onOpenForm}
          onToggleCaught={() => onToggleCaught(id)}
          onToggleShiny={() => onToggleShiny(id)}
          onToggleGender={(key, gender) => onToggleGender(id, key, gender)}
        />
      ) : null}
    </div>
  );
}

type MonBodyProps = {
  mon: MonPayload;
  marks: ReturnType<typeof unionFor>;
  game: string;
  obtainable?: boolean;
  section: DetailSection;
  spawns: WildEncounter[];
  spawnsLoading: boolean;
  learnset: LearnsetGroup[];
  learnsetLoading: boolean;
  recordedGames: string[];
  gameName: string;
  displayName: string;
  speciesName: string;
  speciesId: number;
  rarity: DexIndex["rarity"][number];
  form: SpeciesForm | null;
  prog: Progress;
  canRefreshAi: boolean;
  signedIn: boolean;
  onProgressRefresh?: () => void;
  onOpen: (id: number) => void;
  onOpenForm: (id: number, form: SpeciesForm | null) => void;
  onToggleCaught: () => void;
  onToggleShiny: () => void;
  onToggleGender: (key: MarkKey, gender: GenderChoice) => void;
};

function FormPicker({
  speciesId,
  speciesName,
  form,
  alternateForms,
  variantForms,
  showBaseIn,
  markedCaught,
  onOpenForm,
}: {
  speciesId: number;
  speciesName: string;
  form: SpeciesForm | null;
  alternateForms: SpeciesFormEntry[];
  variantForms: SpeciesFormEntry[];
  showBaseIn: "alternate" | "variant" | null;
  markedCaught: (speciesForm: SpeciesForm | null) => boolean;
  onOpenForm: (id: number, form: SpeciesForm | null) => void;
}) {
  const groups = [
    { id: "alternate" as const, label: "Alternate forms", entries: alternateForms },
    { id: "variant" as const, label: "Variants", entries: variantForms },
  ].filter((group) => group.entries.length || showBaseIn === group.id);
  const both = groups.length > 1;

  return (
    <Blueprint className="pk-forms">
      {both ? <h3>Forms</h3> : <h3>{groups[0]?.label ?? "Forms"}</h3>}
      <div className="pk-form-groups">
        {groups.map((group) => (
          <div key={group.id} className="pk-form-group">
            {both ? <span className="pk-form-group-label">{group.label}</span> : null}
            <div className="pk-evo-row">
              {showBaseIn === group.id ? (
                <button type="button" className="pk-nav pk-evo-cell" onClick={() => onOpenForm(speciesId, null)}>
                  <img src={spriteUrl(speciesId)} alt={speciesName} />
                  <span>{speciesName}</span>
                  {markedCaught(null) ? <PokeBallIcon caught /> : null}
                </button>
              ) : null}
              {group.entries.map((entry) => (
                <button
                  key={entry.key}
                  type="button"
                  className="pk-nav pk-evo-cell"
                  aria-current={formsEqual(form, entry.route) ? "page" : undefined}
                  onClick={() => onOpenForm(speciesId, entry.route)}
                >
                  <SpriteImage
                    pokemonId={entry.spriteId}
                    formName={entry.spriteForm}
                    fallbackId={speciesId}
                    alt={formDisplayName(speciesName, entry.route)}
                  />
                  <span>{formDisplayName(speciesName, entry.route)}</span>
                  {markedCaught(entry.route) ? <PokeBallIcon caught /> : null}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Blueprint>
  );
}

function MonBody({
  mon,
  marks,
  game,
  obtainable,
  section,
  spawns,
  spawnsLoading,
  learnset,
  learnsetLoading,
  recordedGames,
  gameName,
  displayName,
  speciesName,
  speciesId,
  rarity,
  form,
  prog,
  canRefreshAi,
  signedIn,
  onProgressRefresh,
  onOpen,
  onOpenForm,
  onToggleCaught,
  onToggleShiny,
  onToggleGender,
}: MonBodyProps) {
  const capturable = mon.capture !== false;
  const data = mon.data;
  const species = mon.species;
  const myTypes = data.types.map((slot) => slot.type.name);
  const abilities = [...(data.abilities || [])].sort((a, b) => (a.slot || 0) - (b.slot || 0));
  const defense = defensiveGroups(myTypes);
  const offense = offensiveGroups(myTypes);
  const speciesSlug = species.name || data.name;
  const forms = speciesFormEntries(speciesSlug, speciesId, species.varieties, data.forms);
  const alternateForms = forms.filter((entry) => !isCosmeticForm(entry));
  const variantForms = forms.filter((entry) => isCosmeticForm(entry));
  const viewingCosmetic = variantForms.some((entry) => formsEqual(form, entry.route));
  function markedCaught(pokemonId: number, speciesForm: SpeciesForm | null): boolean {
    if (!formIsCapturable(speciesForm)) {
      return false;
    }
    return !!unionFor(prog, pokemonId, speciesForm).caught;
  }
  const spriteForm = form?.kind === "variant" && data.id === speciesId ? form.name : null;
  const spriteId = spriteForm ? speciesId : data.id;
  const gameLines = gamesFromAvailability(mon.games);
  const dexEntries = flavorTextsForGame(species.flavor_text_entries, game);
  const overview = mon.overview?.trim() || null;
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
  const showHome = section === "home";
  const showSpawns = section === "spawns";
  const showSpecimens = section === "specimens";
  const showMoves = section === "moves";

  const [smogon, setSmogon] = useState<SmogonMovesetsPayload | null>(null);
  const [smogonLoading, setSmogonLoading] = useState(false);
  const [ai, setAi] = useState<AiMovesetsPayload | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRefreshing, setAiRefreshing] = useState(false);
  const [aiRefreshError, setAiRefreshError] = useState<string | null>(null);
  const [collectedAbilities, setCollectedAbilities] = useState<string[]>([]);
  const [collectedNatures, setCollectedNatures] = useState<string[]>([]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 900px)");
    const sync = () => setCompactSpawns(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!signedIn) {
      setCollectedAbilities([]);
      setCollectedNatures([]);
      return;
    }
    let cancelled = false;
    fetchOwnedPokemon(speciesId)
      .then((payload) => {
        if (cancelled || !payload) {
          return;
        }
        setCollectedAbilities(payload.collected_abilities);
        setCollectedNatures(payload.collected_natures);
      })
      .catch(() => {
        if (!cancelled) {
          setCollectedAbilities([]);
          setCollectedNatures([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [signedIn, speciesId]);

  const moveLookup = buildMoveLookup(learnset);

  useEffect(() => {
    if (!showMoves) {
      return;
    }
    let cancelled = false;
    setSmogonLoading(true);
    setAiLoading(true);
    fetchSmogonMovesets(data.id, game)
      .then((payload) => {
        if (!cancelled) {
          setSmogon(payload);
          setSmogonLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSmogon(null);
          setSmogonLoading(false);
        }
      });
    fetchAiMovesets(data.id, game)
      .then((payload) => {
        if (!cancelled) {
          setAi(payload);
          setAiLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAi(null);
          setAiLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [data.id, game, showMoves]);

  async function handleRefreshAi() {
    if (!canRefreshAi || aiRefreshing) {
      return;
    }
    setAiRefreshing(true);
    setAiRefreshError(null);
    try {
      const payload = await refreshAiMovesets(data.id, game);
      setAi(payload);
    } catch (error) {
      setAiRefreshError(error instanceof Error ? error.message : "Could not refresh Gemini suggestions.");
    } finally {
      setAiRefreshing(false);
    }
  }

  return (
    <div className="pk-detail-body">
      {showHome ? (
        <>
          <div className="pk-detail-row pk-detail-split pk-detail-overview">
            <div className="pk-side-stack">
              <Blueprint className={boxClass("pk-identity", false, rarity)}>
                <PokeBallIcon caught={!!(marks.caught || marks.shiny)} />
                <div className="pk-identity-head">
                  <div className="pk-identity-meta">
                    <span className="tag pk-dex-box">{dexNum(speciesId)}</span>
                    {rarity ? (
                      <span className="tag pk-rarity-box">
                        {rarityLabel(rarity)}
                        <InfoTip label={`About ${rarityLabel(rarity)} Pokémon`}>
                          <p>{rarityNote(rarity)}</p>
                        </InfoTip>
                      </span>
                    ) : null}
                    <div className="pk-types pk-identity-types">
                      {myTypes.map((type) => (
                        <TypeTag key={type} type={type} />
                      ))}
                    </div>
                  </div>
                  <h1>{displayName}</h1>
                </div>
                <div className="pk-sprite-pair">
                  <figure>
                    <GenderSprites
                      pokemonId={spriteId}
                      formName={spriteForm}
                      fallbackId={speciesId}
                      male={!!marks.caughtMale}
                      female={!!marks.caughtFemale}
                      alt={displayName}
                      className={capturable && !marks.caught ? "is-dim" : undefined}
                    />
                    <figcaption>Normal</figcaption>
                  </figure>
                  <figure>
                    <GenderSprites
                      pokemonId={spriteId}
                      formName={spriteForm}
                      fallbackId={speciesId}
                      shiny
                      male={!!marks.shinyMale}
                      female={!!marks.shinyFemale}
                      alt={`${displayName} shiny`}
                      className={capturable && !marks.shiny ? "is-dim" : undefined}
                    />
                    <figcaption>Shiny</figcaption>
                  </figure>
                </div>
                {capturable ? (
                  <MarkToggles
                    caught={!!marks.caught}
                    shiny={!!marks.shiny}
                    caughtMale={!!marks.caughtMale}
                    caughtFemale={!!marks.caughtFemale}
                    shinyMale={!!marks.shinyMale}
                    shinyFemale={!!marks.shinyFemale}
                    available={obtainable}
                    unavailableLabel={`Not available in ${gameName}`}
                    onCaught={onToggleCaught}
                    onShiny={onToggleShiny}
                    onGender={onToggleGender}
                  />
                ) : null}
                {capturable ? (
                <div className="pk-recorded">
                  <span>
                    {obtainable === true
                      ? `Caught across all saves — marking updates ${gameName}`
                      : "Caught across all saves"}
                  </span>
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
                ) : null}
              </Blueprint>

              {overview ? (
                <Blueprint className="pk-dex-entry pk-overview">
                  <h3>Overview</h3>
                  <p className="pk-dex-entry-text">{overview}</p>
                </Blueprint>
              ) : null}

              {capturable ? (
              <Blueprint className="pk-dex-entry">
                <h3>Pokédex entry</h3>
                {dexEntries.length ? (
                  dexEntries.map((entry) => (
                    <div key={entry.version || entry.source} className="pk-dex-entry-block">
                      <GameTag versionKey={entry.version} label={entry.source} />
                      <p className="pk-dex-entry-text">{entry.text}</p>
                    </div>
                  ))
                ) : (
                  <p className="pk-none">No Pokédex entry for {gameName}.</p>
                )}
              </Blueprint>
              ) : null}

              {mon.evo.length > 1 ? (
                <Blueprint className="pk-evo">
                  <h3>Evolution line</h3>
                  <div className="pk-evo-row">
                    {mon.evo.map((step) => (
                      <button key={step.id} type="button" className="pk-nav pk-evo-cell" onClick={() => onOpen(step.id)}>
                        <img src={spriteUrl(step.id)} alt={step.name} />
                        <span>{step.name}</span>
                        <span>{step.cond}</span>
                        {markedCaught(step.id, null) ? <PokeBallIcon caught /> : null}
                      </button>
                    ))}
                  </div>
                </Blueprint>
              ) : null}

              <Blueprint className="pk-forms">
                <h3>Games</h3>
                <div className="pk-game-columns">
                  {gameLines.map((row) => (
                    <div key={row.gen} className="pk-game-column">
                      <span className="pk-game-column-gen">{row.gen}</span>
                      <div className="pk-game-column-tags">
                        {row.games.map((entry) => (
                          <div key={entry.key} className="pk-game-entry">
                            <GameTag versionKey={entry.key} label={entry.label} />
                            {entry.ways.length ? <span className="pk-game-ways">{entry.ways.join(" · ")}</span> : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <span className="pk-none">
                  {gameLines.length ? "" : "PokéAPI lists no wild encounters, events, or Pokédex entries for this form."}
                </span>
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

              {capturable ? (
              <Blueprint className="pk-traits">
                <h3>Abilities &amp; natures</h3>
                <div className="pk-traits-block">
                  <span className="pk-traits-label">Abilities</span>
                  {abilities.length ? (
                    <ul className="pk-ability-list">
                      {abilities.map((entry) => {
                        const slug = entry.ability.name.toLowerCase();
                        const collected = collectedAbilities.includes(slug);
                        return (
                          <li key={`${entry.slot}-${entry.ability.name}`} className={collected ? "is-collected" : undefined}>
                            <div className="pk-ability-head">
                              <span className="pk-ability-name">{title(entry.ability.name)}</span>
                              {entry.is_hidden ? <span className="pk-ability-tag">Hidden</span> : null}
                              {collected ? <span className="pk-ability-tag is-owned">Collected</span> : null}
                            </div>
                            {entry.description ? <p className="pk-ability-desc">{entry.description}</p> : null}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="pk-none">No abilities listed.</p>
                  )}
                </div>
                <div className="pk-traits-block">
                  <span className="pk-traits-label">Natures</span>
                  <div className="pk-nature-grid">
                    {NATURES.map((nature) => {
                      const collected = collectedNatures.includes(nature.name.toLowerCase());
                      return (
                        <span key={nature.name} className={`pk-nature-chip${collected ? " is-collected" : ""}`}>
                          <span className="pk-nature-name">{nature.name}</span>
                          <span className="pk-nature-mod">{natureModifierLabel(nature)}</span>
                          {collected ? <span className="pk-nature-owned">Collected</span> : null}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </Blueprint>
              ) : null}

              <MatchupPanel title="Defensive matchups" groups={defense} />
              <MatchupPanel title="Offensive matchups" groups={offense} />

              {forms.length ? (
                <FormPicker
                  speciesId={speciesId}
                  speciesName={speciesName}
                  form={form}
                  alternateForms={alternateForms}
                  variantForms={variantForms}
                  showBaseIn={form ? (viewingCosmetic ? "variant" : "alternate") : null}
                  markedCaught={(speciesForm) => markedCaught(speciesId, speciesForm)}
                  onOpenForm={onOpenForm}
                />
              ) : null}
            </div>
          </div>
        </>
      ) : null}

      {showSpecimens ? (
        <OwnedCollectionPanel
          pokemonId={speciesId}
          speciesSlug={species.name || data.name}
          types={myTypes}
          game={game}
          gameName={gameName}
          signedIn={signedIn}
          abilities={abilities.map((entry) => ({
            name: entry.ability.name,
            slot: entry.slot,
            is_hidden: entry.is_hidden,
          }))}
          baseStats={baseStatsFromPokeApi(data.stats)}
          onChanged={() => onProgressRefresh?.()}
          onCollectedTraits={(nextAbilities, nextNatures) => {
            setCollectedAbilities(nextAbilities);
            setCollectedNatures(nextNatures);
          }}
        />
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

          <div className="pk-moveset-block">
            <div className="pk-moveset-block-head">
              <h4>Recommended movesets</h4>
              <span>
                Data from{" "}
                <a href={smogon?.attribution_url || "https://www.smogon.com/"} target="_blank" rel="noreferrer">
                  Smogon
                </a>
              </span>
            </div>
            {smogonLoading ? (
              <p className="pk-spawn-empty">Loading Smogon sets…</p>
            ) : smogon?.sets?.length ? (
              <div className="pk-moveset-grid">
                {smogon.sets.map((set) => (
                  <MovesetCardView key={`smogon-${set.name}`} set={set} moveLookup={moveLookup} />
                ))}
              </div>
            ) : (
              <p className="pk-spawn-empty">No Smogon sets found for this Pokémon in the selected game’s generation.</p>
            )}
          </div>

          <div className="pk-moveset-block">
            <div className="pk-moveset-block-head">
              <h4>Moves Suggested by Gemini</h4>
              {canRefreshAi ? (
                <button
                  type="button"
                  className="btn pk-nav pk-ai-refresh"
                  disabled={aiRefreshing || aiLoading}
                  onClick={() => {
                    void handleRefreshAi();
                  }}
                >
                  {aiRefreshing ? "Refreshing…" : "Refresh with Gemini"}
                </button>
              ) : null}
            </div>
            {aiRefreshError ? <p className="pk-spawn-empty">{aiRefreshError}</p> : null}
            {aiLoading ? (
              <p className="pk-spawn-empty">Loading Gemini suggestions…</p>
            ) : ai?.sets?.length ? (
              <div className="pk-moveset-grid">
                {ai.sets.map((set) => (
                  <MovesetCardView key={`ai-${set.name}`} set={set} moveLookup={moveLookup} />
                ))}
              </div>
            ) : (
              <p className="pk-spawn-empty">
                {aiRefreshing
                  ? "Refreshing Gemini suggestions…"
                  : ai?.message || "We apologize, AI suggestions by Gemini is not available right now."}
              </p>
            )}
          </div>

          <div className="pk-moveset-block">
            <div className="pk-moveset-block-head">
              <h4>Full learnset</h4>
              <span>{game === "home" ? "All games" : gameName}</span>
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
                      {group.moves.map((move) => (
                        <span key={`${group.method}-${move.id}`} className="pk-move-row">
                          <MoveNameTag name={move.name} type={move.type} damageClass={move.damage_class} />
                          {group.method === "level-up" ? (
                            <span className="pk-move-meta">{move.level > 0 ? `Lv ${move.level}` : "Lv —"}</span>
                          ) : null}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="pk-spawn-empty">No learnset data for the selected game.</p>
            )}
          </div>
        </Blueprint>
      ) : null}
    </div>
  );
}

function flavorTextsForGame(
  entries: MonPayload["species"]["flavor_text_entries"],
  gameKey: string,
): Array<{ text: string; source: string; version: string }> {
  const english = (entries || []).filter(
    (entry) => entry.language?.name === "en" && (entry.flavor_text || "").trim(),
  );
  if (!english.length) {
    return [];
  }

  const clean = (value: string) => value.replace(/\f/g, " ").replace(/\s+/g, " ").trim();
  const versions = versionsForGame(gameKey);

  if (versions === null) {
    const latest = [...english].reverse().find((entry) => entry.flavor_text);
    if (!latest?.flavor_text) {
      return [];
    }
    return [
      {
        text: clean(latest.flavor_text),
        source: versionLabel(latest.version.name) || "Pokémon HOME",
        version: latest.version.name,
      },
    ];
  }

  const results: Array<{ text: string; source: string; version: string }> = [];
  for (const version of versions) {
    const match = english.find((entry) => entry.version?.name === version);
    if (match?.flavor_text) {
      results.push({
        text: clean(match.flavor_text),
        source: versionLabel(version) || title(version),
        version,
      });
    }
  }
  return results;
}

function speciesDisplayName(names: DexIndex["names"], id: number, mon: MonPayload): string {
  if (names[id]) {
    return names[id];
  }
  const english = mon.species.names?.find((entry) => entry.language?.name === "en")?.name;
  if (english) {
    return english;
  }
  if (mon.species.name) {
    return title(mon.species.name);
  }
  return title(mon.data.name);
}

function normalizeMoveKey(value: string): string {
  return value.trim().toLowerCase().replace(/[’']/g, "'");
}

function buildMoveLookup(groups: LearnsetGroup[]): Map<string, { name: string; type: string | null; damage_class: string | null }> {
  const lookup = new Map<string, { name: string; type: string | null; damage_class: string | null }>();
  groups.forEach((group) => {
    group.moves.forEach((move) => {
      lookup.set(normalizeMoveKey(move.name), {
        name: move.name,
        type: move.type,
        damage_class: move.damage_class,
      });
    });
  });
  return lookup;
}

function resolveMoveMeta(
  label: string,
  lookup: Map<string, { name: string; type: string | null; damage_class: string | null }>,
) {
  const exact = lookup.get(normalizeMoveKey(label));
  if (exact) {
    return exact;
  }
  const folded = normalizeMoveKey(label);
  for (const [key, meta] of lookup) {
    if (folded.startsWith(`${key} `) || key.startsWith(`${folded} `)) {
      return { ...meta, name: label };
    }
  }
  return { name: label, type: null, damage_class: null };
}

function MovesetCardView({
  set,
  moveLookup,
}: {
  set: MovesetCard;
  moveLookup: Map<string, { name: string; type: string | null; damage_class: string | null }>;
}) {
  const summary = (set.notes || set.role || "").trim();
  return (
    <article className="pk-moveset-card">
      <header className="pk-moveset-card-head">
        <strong>{set.name}</strong>
        {summary ? <p className="pk-moveset-notes">{summary}</p> : null}
      </header>
      <ol className="pk-moveset-moves">
        {set.moves.map((slot) => {
          const options = slot.split(/\s*\/\s*/).map((part) => part.trim()).filter(Boolean);
          return (
            <li key={`${set.name}-${slot}`} className="pk-moveset-slot">
              {options.map((option, index) => {
                const meta = resolveMoveMeta(option, moveLookup);
                return (
                  <span key={`${set.name}-${option}-${index}`} className="pk-moveset-option">
                    {index > 0 ? <span className="pk-moveset-slash">/</span> : null}
                    <MoveNameTag name={meta.name} type={meta.type} damageClass={meta.damage_class} />
                  </span>
                );
              })}
            </li>
          );
        })}
      </ol>
    </article>
  );
}
