import { useEffect, useMemo, useState } from "react";
import { Blueprint } from "../components/Blueprint";
import { LastCaughtCard } from "../components/LastCaughtCard";
import { PkBulkImport } from "../components/PkBulkImport";
import { PokemonCard } from "../components/PokemonCard";
import { ProgressBar } from "../components/ProgressBar";
import { LanguagePrompt } from "../components/LanguagePrompt";
import { REGIONS, genById } from "../catalog";
import { filterDexIds } from "../dexList";
import { dexNum } from "../format";
import { formDisplayName, formListOf, formSpriteRef, formStorageKey, formsEqual, parseMarkKey, type FormList, type SpeciesForm } from "../forms";
import { useI18n } from "../i18n/context";
import { formListCopy, localizedRegion, localizedRegionGames, notInGame } from "../i18n/labels";
import type { CatalogForm } from "../pokeapi";
import { gameLabel, unionFor, unionSets } from "../progress";
import type { DexIndex, MarkKey, Progress } from "../types";

const MIN_SEARCH_LENGTH = 2;

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
    title: localizedRegion(entry.slug) || entry.name,
    subtitle: localizedRegionGames(entry.slug) || entry.games,
    from: entry.from,
    to: entry.to,
    open: () => onOpenRegion(entry.slug),
  }));
}

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
  const { messages: m, fill } = useI18n();
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
    { label: m.dash.registered, value: String(registered), sub: fill(m.dash.registeredSub, { total }) },
    { label: m.dash.completion, value: `${Math.round((registered / total) * 100)}%`, sub: fill(m.dash.completionSub, { count: total - registered }) },
    { label: m.dash.shiny, value: String(shiny), sub: fill(m.dash.shinySub, { count: caught }) },
    { label: m.dash.activeGame, value: String(activeCaught), sub: fill(m.dash.activeGameSub, { game: gameLabel(game) }) },
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
  const recentRows = events.slice(0, 6).map((item) => {
    const catalog = item.form
      ? forms.find((entry) => entry.pokedexId === item.id && formsEqual(entry.form, item.form))
      : undefined;
    const species = index.names[item.id] || fill(m.dash.numberFallback, { id: item.id });
    const name = item.form ? formDisplayName(species, item.form) : species;
    return { item, name, sprite: formSpriteRef(item.id, item.form, catalog), catalog };
  });
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

  const recentIds = recentRows.map((row) => row.item.id);
  useEffect(() => {
    const ids = [...matches.map((hit) => hit.id), ...recentIds];
    if (ids.length) {
      onEnsureObtainable(ids);
    }
  }, [matches, onEnsureObtainable, recentIds.join(",")]);

  return (
    <div className="pk-page pk-dash">
      <LanguagePrompt />
      <Blueprint className="pk-welcome">
        <div className="pk-welcome-head">
          <h2>{m.dash.welcome}</h2>
          <span className="pk-kicker">{m.dash.kicker}</span>
        </div>
        <p className="pk-welcome-lead">{m.dash.lead}</p>
        <div className="pk-welcome-grid">
          {[
            { title: m.dash.features.selectorTitle, body: m.dash.features.selectorBody },
            { title: m.dash.features.dexTitle, body: m.dash.features.dexBody },
            { title: m.dash.features.speciesTitle, body: m.dash.features.speciesBody },
            { title: m.dash.features.specimensTitle, body: m.dash.features.specimensBody },
          ].map((feature) => (
            <Blueprint key={feature.title} className="pk-welcome-box">
              <h3>{feature.title}</h3>
              <p>{feature.body}</p>
            </Blueprint>
          ))}
        </div>
        <p className="pk-welcome-note">{m.dash.note}</p>
      </Blueprint>

      <section className="pk-section" aria-labelledby="dash-search-title">
        <div className="pk-section-head">
          <h2 id="dash-search-title">{m.dash.search}</h2>
        </div>
        <Blueprint className="pk-search-box">
          <p className="pk-dash-find-note">{m.dash.searchNote}</p>
          <label className="field pk-field pk-search" htmlFor="dash-pokemon-search">
            <input
              id="dash-pokemon-search"
              className="input"
              type="search"
              placeholder={m.dash.searchPlaceholder}
              aria-label={m.dash.searchLabel}
              value={query}
              autoComplete="off"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          {searching ? (
            indexLoading || (formsLoading && matches.length === 0) ? (
              <div className="pk-status">{formsLoading && !indexLoading ? m.dash.loadingForms : m.dash.loadingIndex}</div>
            ) : matches.length === 0 ? (
              <div className="pk-status">{m.dash.noResults}</div>
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
                      unavailableLabel={notInGame(gameLabel(game))}
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

      <section className="pk-section" aria-labelledby="dash-stats-title">
        <div className="pk-section-head">
          <h2 id="dash-stats-title">{m.dash.stats}</h2>
        </div>
        <div className="pk-kpi-grid">
        {kpis.map((kpi) => (
          <Blueprint key={kpi.label} className="pk-kpi">
            <div className="pk-kicker">{kpi.label}</div>
            <div className="pk-kpi-value">{kpi.value}</div>
            <div className="pk-kpi-sub">{kpi.sub}</div>
          </Blueprint>
        ))}
        </div>
      </section>

      <PkBulkImport isStaff={isStaff} game={game} onImported={onImported} />

      <section className="pk-section">
        <div className="pk-section-head">
          <h2>{m.dash.lastCaught}</h2>
          <span>{m.dash.lastCaughtSub}</span>
        </div>
        {recentRows.length === 0 ? (
          <Blueprint className="pk-empty">{m.dash.nothingMarked}</Blueprint>
        ) : (
          <>
            <div className="pk-grid pk-recent-grid">
              {recentRows.map(({ item, name, catalog }) => {
                const form = catalog ?? null;
                const marks = unionFor(prog, item.id, item.form);
                return (
                  <PokemonCard
                    key={`${item.game}-${item.id}-${formStorageKey(item.form)}-${item.kind}`}
                    id={item.id}
                    spriteId={form ? form.resourceId : undefined}
                    formName={form?.spriteForm}
                    capturable={form ? form.capture : true}
                    name={name}
                    types={form ? form.types : index.types[item.id] || []}
                    rarity={index.rarity[item.id]}
                    numberLabel={dexNum(item.id)}
                    caught={!!marks.caught}
                    shiny={!!marks.shiny}
                    caughtMale={!!marks.caughtMale}
                    caughtFemale={!!marks.caughtFemale}
                    shinyMale={!!marks.shinyMale}
                    shinyFemale={!!marks.shinyFemale}
                    games={marks.where}
                    obtainable={obtainable[item.id]}
                    unavailableLabel={notInGame(gameLabel(game))}
                    onOpen={() => (item.form ? onOpenForm(item.id, item.form) : onOpen(item.id))}
                    onToggleCaught={() => (item.form ? onToggleForm(item.id, item.form, "caught") : onToggleCaught(item.id))}
                    onToggleShiny={() => (item.form ? onToggleForm(item.id, item.form, "shiny") : onToggleShiny(item.id))}
                    onMoveGame={(fromGame, toGame) => onMoveGame(item.id, item.form, fromGame, toGame)}
                  />
                );
              })}
            </div>
            <div className="pk-recent-list">
              {recentRows.map(({ item, name, sprite }) => (
                <LastCaughtCard
                  key={`${item.game}-${item.id}-${formStorageKey(item.form)}-${item.kind}-row`}
                  id={item.id}
                  name={name}
                  rarity={index.rarity[item.id]}
                  spriteId={sprite.pokemonId}
                  formName={sprite.formName}
                  kind={item.kind}
                  game={item.game}
                  at={item.at}
                  onOpen={() => (item.form ? onOpenForm(item.id, item.form) : onOpen(item.id))}
                />
              ))}
            </div>
          </>
        )}
      </section>

      <section className="pk-section">
        <div className="pk-section-head">
          <h2>{m.dash.regions}</h2>
          <span>{m.dash.regionsSub}</span>
        </div>
        <div className="pk-gen-grid pk-region-grid">
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
                  <span className="pk-gen-shiny">{fill(m.dash.shinies, { count: s })}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="pk-section">
        <div className="pk-section-head">
          <h2>{m.dash.forms}</h2>
          <span>{m.dash.formsSub}</span>
        </div>
        <div className="pk-gen-grid">
          {(["mega", "gmax", "regional"] as const).map((id) => {
            const entry = formListCopy(id);
            const rows = forms.filter((form) => formListOf(form.form) === id);
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
              <button key={id} type="button" className="blueprint pk-cell pk-nav pk-gen-box" onClick={() => onOpenFormList(id)}>
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
                  <span className="pk-gen-frac">{temporary ? (total ? fill(m.dash.formsCount, { count: total }) : m.dash.noneStored) : `${caught} / ${total || "—"}`}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="pk-shortcut-grid">
        {[
          { title: m.dash.resumeTitle, body: fill(m.dash.resumeBody, { roman: currentGen.roman }), go: onOpenDex },
          { title: m.dash.missingTitle, body: m.dash.missingBody, go: onOpenMissing },
          { title: m.dash.shiniesTitle, body: m.dash.shiniesBody, go: onOpenShinies },
        ].map((item) => (
          <button key={item.title} type="button" className="blueprint pk-cell pk-nav pk-shortcut" onClick={item.go}>
            <i className="corner tl" aria-hidden="true" />
            <i className="corner tr" aria-hidden="true" />
            <i className="corner bl" aria-hidden="true" />
            <i className="corner br" aria-hidden="true" />
            <span className="pk-kicker">{m.dash.shortcut}</span>
            <span className="pk-shortcut-title">{item.title}</span>
            <span className="pk-shortcut-body">{item.body}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
