import { Blueprint } from "../components/Blueprint";
import { boxClass } from "../rarity";
import { DexToolbar } from "../components/DexToolbar";
import { GameKeyTag } from "../components/GameTag";
import { MarkToggles } from "../components/MarkToggles";
import { GenderSprites } from "../components/GenderSprites";
import { PokemonSprite } from "../components/PokemonSprite";
import { TypeTag } from "../components/TypeTag";
import { dexCandidateIds, dexHeadCopy, filterDexIds } from "../dexList";
import { dexNum } from "../format";
import { FORM_LISTS, formDisplayName, formListOf, formStorageKey, type FormList, type SpeciesForm } from "../forms";
import type { CatalogForm, RegionalDex } from "../pokeapi";
import { gameLabel, unionFor } from "../progress";
import type { DexIndex, DexScope, Progress, StatusFilter } from "../types";

type DexViewProps = {
  index: DexIndex;
  indexLoading: boolean;
  prog: Progress;
  game: string;
  gen: number;
  region?: string | null;
  q: string;
  status: StatusFilter;
  scope: DexScope;
  regional: RegionalDex | null;
  regionalLoading: boolean;
  dimUncaught?: boolean;
  obtainable: Record<number, boolean>;
  formList?: FormList | null;
  forms?: CatalogForm[];
  formsLoading?: boolean;
  onQuery: (q: string) => void;
  onStatus: (status: StatusFilter) => void;
  onScope: (scope: DexScope) => void;
  onOpen: (id: number) => void;
  onOpenForm?: (id: number, form: SpeciesForm) => void;
  onToggleCaught: (id: number) => void;
  onToggleShiny: (id: number) => void;
  onToggleForm?: (id: number, form: SpeciesForm, key: "caught" | "shiny") => void;
};

export function DexView({
  index,
  indexLoading,
  prog,
  game,
  gen,
  region = null,
  q,
  status,
  scope,
  regional,
  regionalLoading,
  dimUncaught = true,
  obtainable,
  formList = null,
  forms = [],
  formsLoading = false,
  onQuery,
  onStatus,
  onScope,
  onOpen,
  onOpenForm,
  onToggleCaught,
  onToggleShiny,
  onToggleForm,
}: DexViewProps) {
  const candidateIds = dexCandidateIds(scope, game, regional, gen, region);
  const grid = filterDexIds(candidateIds, index, prog, status, q);
  const formTitle = FORM_LISTS.find((entry) => entry.id === formList)?.title ?? "";
  const formRows = formList
    ? forms.filter((entry) => {
        if (formListOf(entry.form) !== formList) {
          return false;
        }
        const marks = unionFor(prog, entry.pokedexId, entry.form);
        const name = formDisplayName(index.names[entry.pokedexId] || "", entry.form);
        const needle = q.trim().toLowerCase();
        if (status === "missing" && (marks.caught || marks.shiny)) {
          return false;
        }
        if (status === "missing-normal" && marks.caught) {
          return false;
        }
        if (status === "missing-shiny" && marks.shiny) {
          return false;
        }
        if (status === "normal" && !marks.caught) {
          return false;
        }
        if (status === "shiny" && !marks.shiny) {
          return false;
        }
        if (needle && name.toLowerCase().indexOf(needle) === -1 && String(entry.pokedexId).indexOf(needle) === -1) {
          return false;
        }
        return true;
      })
    : [];
  const head = formList
    ? {
        title: formTitle,
        meta: `${formRows.length} of ${forms.filter((entry) => formListOf(entry.form) === formList).length} shown`,
      }
    : dexHeadCopy(scope, game, grid.length, candidateIds.length, "dex", gen, region);

  return (
    <div className="pk-page pk-dex">
      <DexToolbar
        game={game}
        gen={gen}
        region={region}
        q={q}
        status={status}
        scope={scope}
        onQuery={onQuery}
        onStatus={onStatus}
        onScope={onScope}
        formListTitle={formList ? formTitle : null}
      />

      <div className="pk-dex-head">
        <h2>{head.title}</h2>
        <span>{head.meta}</span>
      </div>

      {!formList && (indexLoading || (scope === "regional" && regionalLoading)) ? (
        <div className="pk-status">{scope === "regional" ? "Loading regional Pokédex…" : "Loading index from PokéAPI…"}</div>
      ) : null}

      {formList ? (
        formsLoading ? (
          <div className="pk-status">Loading forms…</div>
        ) : (
          <div className="pk-grid">
            {formRows.map((entry) => {
              const captured = entry.capture;
              const marks = unionFor(prog, entry.pokedexId, entry.form);
              const marked = captured && !!(marks.caught || marks.shiny);
              const name = formDisplayName(index.names[entry.pokedexId] || "", entry.form);
              const available = obtainable[entry.pokedexId];
              return (
                <Blueprint key={`${entry.pokedexId}:${formStorageKey(entry.form)}`} className={boxClass("pk-mon", marked, index.rarity[entry.pokedexId])}>
                  <button type="button" className="pk-nav pk-mon-open" onClick={() => onOpenForm?.(entry.pokedexId, entry.form)}>
                    <span className="pk-mon-top">
                      <span>{dexNum(entry.pokedexId)}</span>
                      {captured ? (
                        <span className="pk-mon-mark">
                          {marks.caught && marks.shiny ? "NORMAL + SHINY" : marks.shiny ? "SHINY" : marks.caught ? "NORMAL" : ""}
                        </span>
                      ) : null}
                    </span>
                    <PokemonSprite
                      pokemonId={entry.resourceId}
                      alt={name}
                      loading="lazy"
                      className={!captured || marked || !dimUncaught ? "pk-mon-sprite" : "pk-mon-sprite is-dim"}
                    />
                    <span className="pk-name">{name}</span>
                    <span className="pk-types">
                      {entry.types.map((type) => (
                        <TypeTag key={type} type={type} />
                      ))}
                    </span>
                  </button>
                  {captured && marks.where.length ? (
                    <span className="pk-mon-games">
                      {marks.where.map((gameKey) => (
                        <GameKeyTag key={gameKey} gameKey={gameKey} />
                      ))}
                    </span>
                  ) : null}
                  {captured ? (
                    <MarkToggles
                      caught={!!marks.caught}
                      shiny={!!marks.shiny}
                      available={available}
                      unavailableLabel={`Not In ${gameLabel(game)}`}
                      onCaught={() => onToggleForm?.(entry.pokedexId, entry.form, "caught")}
                      onShiny={() => onToggleForm?.(entry.pokedexId, entry.form, "shiny")}
                    />
                  ) : null}
                </Blueprint>
              );
            })}
          </div>
        )
      ) : (
      <div className="pk-grid">
        {grid.map((id) => {
          const marks = unionFor(prog, id);
          const marked = !!(marks.caught || marks.shiny);
          const types = index.types[id] || [];
          const available = obtainable[id];
          const numberLabel = scope === "regional" && regional?.numbers[id] ? dexNum(regional.numbers[id]) : dexNum(id);
          return (
            <Blueprint key={id} className={boxClass("pk-mon", marked, index.rarity[id])}>
              <button type="button" className="pk-nav pk-mon-open" onClick={() => onOpen(id)}>
                <span className="pk-mon-top">
                  <span>{numberLabel}</span>
                  <span className="pk-mon-mark">
                    {marks.caught && marks.shiny ? "NORMAL + SHINY" : marks.shiny ? "SHINY" : marks.caught ? "NORMAL" : ""}
                  </span>
                </span>
                <GenderSprites
                  pokemonId={id}
                  shiny={!!marks.shiny && !(marks.caughtMale && marks.caughtFemale)}
                  male={!!(marks.caughtMale && marks.caughtFemale ? marks.caughtMale : marks.shiny ? marks.shinyMale : marks.caughtMale)}
                  female={!!(marks.caughtMale && marks.caughtFemale ? marks.caughtFemale : marks.shiny ? marks.shinyFemale : marks.caughtFemale)}
                  alt={index.names[id]}
                  loading="lazy"
                  className={marked || !dimUncaught ? "pk-mon-sprite" : "pk-mon-sprite is-dim"}
                />
                <span className="pk-name">{index.names[id]}</span>
                <span className="pk-types">
                  {types.map((type) => (
                    <TypeTag key={type} type={type} />
                  ))}
                </span>
              </button>
              {marks.where.length ? (
                <span className="pk-mon-games">
                  {marks.where.map((gameKey) => (
                    <GameKeyTag key={gameKey} gameKey={gameKey} />
                  ))}
                </span>
              ) : null}
              <MarkToggles
                caught={!!marks.caught}
                shiny={!!marks.shiny}
                available={available}
                unavailableLabel={`Not In ${gameLabel(game)}`}
                onCaught={() => onToggleCaught(id)}
                onShiny={() => onToggleShiny(id)}
              />
            </Blueprint>
          );
        })}
      </div>
      )}

      {!formList && !indexLoading && !(scope === "regional" && regionalLoading) && grid.length === 0 ? (
        <div className="pk-status">No results for these filters</div>
      ) : null}
      {formList && !formsLoading && formRows.length === 0 ? (
        <div className="pk-status">No results for these filters</div>
      ) : null}
    </div>
  );
}
