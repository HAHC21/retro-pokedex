import { useEffect, useMemo, useState } from "react";
import { Blueprint } from "../components/Blueprint";
import { PkBulkImport } from "../components/PkBulkImport";
import { PokemonCard } from "../components/PokemonCard";
import { ProgressBar } from "../components/ProgressBar";
import { REGIONS, genById } from "../catalog";
import { filterDexIds } from "../dexList";
import { dexNum, kindStyle, spriteUrl, whenText } from "../format";
import { FORM_LISTS, formDisplayName, formListOf, formStorageKey, formsEqual, parseMarkKey, type FormList, type SpeciesForm } from "../forms";
import type { CatalogForm } from "../pokeapi";
import { gameLabel, unionFor, unionSets } from "../progress";
import type { DexIndex, MarkKey, Progress } from "../types";

const MIN_SEARCH_LENGTH = 2;

function recentSprite(
  id: number,
  form: SpeciesForm | null,
  catalog: CatalogForm | undefined,
): { pokemonId: number; formName: string | null } {
  if (form?.kind === "variant" && form.name) {
    if (catalog && !catalog.spriteForm && catalog.resourceId !== id) {
      return { pokemonId: catalog.resourceId, formName: null };
    }
    return { pokemonId: id, formName: catalog?.spriteForm || form.name };
  }
  if (catalog) {
    return {
      pokemonId: catalog.spriteForm ? id : catalog.resourceId,
      formName: catalog.spriteForm,
    };
  }
  return { pokemonId: id, formName: null };
}

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
  formsLoading: boolean;
  indexLoading: boolean;
  obtainable: Record<number, boolean>;
  onEnsureObtainable: (ids: number[]) => void;
  onOpenForm: (id: number, form: SpeciesForm) => void;
  onToggleCaught: (id: number) => void;
  onToggleShiny: (id: number) => void;
  onToggleForm: (id: number, form: SpeciesForm, key: MarkKey) => void;
  onMoveGame: (id: number, form: SpeciesForm | null, fromGame: string, toGame: string) => void;
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
  formsLoading,
  indexLoading,
  obtainable,
  onEnsureObtainable,
  onOpenForm,
  onToggleCaught,
  onToggleShiny,
  onToggleForm,
  onMoveGame,
  onOpenDex,
  onOpenMissing,
  onOpenShinies,
}: DashboardViewProps) {
  const [query, setQuery] = useState("");
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

  const events: Array<{ id: number; form: SpeciesForm | null; kind: "Normal" | "Shiny"; at: number; game: string }> = [];
  Object.entries(prog).forEach(([gk, gm]) => {
    Object.entries(gm).forEach(([raw, entry]) => {
      const parsed = parseMarkKey(raw);
      if (!parsed) {
        return;
      }
      if (entry.caught) {
        events.push({ id: parsed.id, form: parsed.form, kind: "Normal", at: entry.caughtAt || 0, game: gk });
      }
      if (entry.shiny) {
        events.push({ id: parsed.id, form: parsed.form, kind: "Shiny", at: entry.shinyAt || 0, game: gk });
      }
    });
  });
  events.sort((a, b) => b.at - a.at);
  const recent = events.slice(0, 6);
  const needle = query.trim();
  const searching = needle.length >= MIN_SEARCH_LENGTH;
  const matches = useMemo(() => {
    if (!searching) {
      return [];
    }
    const catalogIds = Object.keys(index.names)
      .map(Number)
      .sort((left, right) => left - right);
    const speciesIds = filterDexIds(catalogIds, index, prog, "all", needle);
    const speciesSet = new Set(speciesIds);
    const lowered = needle.toLowerCase();
    const formHits = forms.filter((entry) => {
      const speciesName = index.names[entry.pokedexId];
      if (!speciesName) {
        return false;
      }
      const name = formDisplayName(speciesName, entry.form);
      return name.toLowerCase().indexOf(lowered) !== -1 || String(entry.pokedexId).indexOf(lowered) !== -1;
    });
    const order = [...new Set([...speciesIds, ...formHits.map((entry) => entry.pokedexId)])].sort((left, right) => left - right);
    return order.flatMap((id) => {
      const hits: Array<{ key: string; id: number; form: CatalogForm | null }> = [];
      if (speciesSet.has(id)) {
        hits.push({ key: String(id), id, form: null });
      }
      formHits
        .filter((entry) => entry.pokedexId === id)
        .forEach((entry) => {
          hits.push({ key: `${id}:${formStorageKey(entry.form)}`, id, form: entry });
        });
      return hits;
    });
  }, [forms, index, needle, prog, searching]);

  useEffect(() => {
    if (matches.length) {
      onEnsureObtainable(matches.map((hit) => hit.id));
    }
  }, [matches, onEnsureObtainable]);

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

      <section className="pk-section" aria-labelledby="dash-search-title">
        <div className="pk-section-head">
          <h2 id="dash-search-title">Search</h2>
        </div>
        <Blueprint className="pk-search-box">
          <p className="pk-dash-find-note">
            Type at least two characters of a name or a National Dex number. Matching species, alternate forms, and variants show up here as cards.
          </p>
          <label className="field pk-field pk-search" htmlFor="dash-pokemon-search">
            <input
              id="dash-pokemon-search"
              className="input"
              type="search"
              placeholder="Name or number"
              aria-label="Search by name or National Dex number"
              value={query}
              autoComplete="off"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          {searching ? (
            indexLoading || (formsLoading && matches.length === 0) ? (
              <div className="pk-status">{formsLoading && !indexLoading ? "Loading forms…" : "Loading index from PokéAPI…"}</div>
            ) : matches.length === 0 ? (
              <div className="pk-status">No results for these filters</div>
            ) : (
              <div className="pk-grid">
                {matches.map((hit) => {
                  const form = hit.form;
                  const marks = unionFor(prog, hit.id, form?.form);
                  const name = form ? formDisplayName(index.names[hit.id] || "", form.form) : index.names[hit.id];
                  return (
                    <PokemonCard
                      key={hit.key}
                      id={hit.id}
                      spriteId={form ? form.resourceId : undefined}
                      formName={form?.spriteForm}
                      capturable={form ? form.capture : true}
                      name={name}
                      types={form ? form.types : index.types[hit.id] || []}
                      rarity={index.rarity[hit.id]}
                      numberLabel={dexNum(hit.id)}
                      caught={!!marks.caught}
                      shiny={!!marks.shiny}
                      caughtMale={!!marks.caughtMale}
                      caughtFemale={!!marks.caughtFemale}
                      shinyMale={!!marks.shinyMale}
                      shinyFemale={!!marks.shinyFemale}
                      games={marks.where}
                      obtainable={obtainable[hit.id]}
                      unavailableLabel={`Not In ${gameLabel(game)}`}
                      onOpen={() => (form ? onOpenForm(hit.id, form.form) : onOpen(hit.id))}
                      onToggleCaught={() => (form ? onToggleForm(hit.id, form.form, "caught") : onToggleCaught(hit.id))}
                      onToggleShiny={() => (form ? onToggleForm(hit.id, form.form, "shiny") : onToggleShiny(hit.id))}
                      onMoveGame={(fromGame, toGame) => onMoveGame(hit.id, form?.form ?? null, fromGame, toGame)}
                    />
                  );
                })}
              </div>
            )
          ) : null}
        </Blueprint>
      </section>

      <section className="pk-section">
        <div className="pk-section-head">
          <h2>Last caught</h2>
          <span>Most recent marks across every game</span>
        </div>
        {recent.length === 0 ? (
          <Blueprint className="pk-empty">Nothing marked yet — open the Pokédex to start</Blueprint>
        ) : (
          <div className="pk-recent-grid">
            {recent.map((item) => {
              const catalog = item.form
                ? forms.find((entry) => entry.pokedexId === item.id && formsEqual(entry.form, item.form))
                : undefined;
              const species = index.names[item.id] || `No. ${item.id}`;
              const name = item.form ? formDisplayName(species, item.form) : species;
              const sprite = recentSprite(item.id, item.form, catalog);
              return (
              <button
                key={`${item.game}-${item.id}-${formStorageKey(item.form)}-${item.kind}`}
                type="button"
                className="blueprint pk-cell pk-nav pk-recent"
                onClick={() => (item.form ? onOpenForm(item.id, item.form) : onOpen(item.id))}
              >
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
                <img src={spriteUrl(sprite.pokemonId, item.kind === "Shiny", false, sprite.formName)} alt={name} loading="lazy" />
                <span className="pk-name">{name}</span>
                <span className="pk-recent-game">{gameLabel(item.game)}</span>
                <span className="pk-when">{whenText(item.at)}</span>
              </button>
              );
            })}
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
