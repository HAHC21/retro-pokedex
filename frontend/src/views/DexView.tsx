import { DexToolbar } from "../components/DexToolbar";
import { PokemonCard } from "../components/PokemonCard";
import { ViewLoading } from "../components/ViewLoading";
import { dexCandidateIds, dexHeadCopy, filterDexIds } from "../dexList";
import { dexNum } from "../format";
import { formDisplayName, formListOf, formStorageKey, type FormList, type SpeciesForm } from "../forms";
import { useI18n } from "../i18n/context";
import { formListCopy, notInGame } from "../i18n/labels";
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
  onMoveGame: (id: number, form: SpeciesForm | null, fromGame: string, toGame: string) => void;
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
  onMoveGame,
}: DexViewProps) {
  const { messages: m, fill } = useI18n();
  const candidateIds = dexCandidateIds(scope, game, regional, gen, region);
  const grid = filterDexIds(candidateIds, index, prog, status, q);
  const formTitle = formList ? formListCopy(formList).title : "";
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
        meta: fill(m.dex.shown, {
          shown: formRows.length,
          total: forms.filter((entry) => formListOf(entry.form) === formList).length,
        }),
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
        <ViewLoading>{scope === "regional" ? m.dex.loadingRegional : m.dex.loadingIndex}</ViewLoading>
      ) : null}

      {formList ? (
        formsLoading ? (
          <ViewLoading>{m.dex.loadingForms}</ViewLoading>
        ) : (
          <div className="pk-grid">
            {formRows.map((entry) => {
              const marks = unionFor(prog, entry.pokedexId, entry.form);
              const name = formDisplayName(index.names[entry.pokedexId] || "", entry.form);
              return (
                <PokemonCard
                  key={`${entry.pokedexId}:${formStorageKey(entry.form)}`}
                  id={entry.pokedexId}
                  spriteId={entry.resourceId}
                  capturable={entry.capture}
                  name={name}
                  types={entry.types}
                  rarity={index.rarity[entry.pokedexId]}
                  numberLabel={dexNum(entry.pokedexId)}
                  caught={!!marks.caught}
                  shiny={!!marks.shiny}
                  caughtMale={!!marks.caughtMale}
                  caughtFemale={!!marks.caughtFemale}
                  shinyMale={!!marks.shinyMale}
                  shinyFemale={!!marks.shinyFemale}
                  games={marks.where}
                  obtainable={obtainable[entry.pokedexId]}
                  dimUncaught={dimUncaught}
                  unavailableLabel={notInGame(gameLabel(game))}
                  onOpen={() => onOpenForm?.(entry.pokedexId, entry.form)}
                  onToggleCaught={() => onToggleForm?.(entry.pokedexId, entry.form, "caught")}
                  onToggleShiny={() => onToggleForm?.(entry.pokedexId, entry.form, "shiny")}
                  onMoveGame={(fromGame, toGame) => onMoveGame(entry.pokedexId, entry.form, fromGame, toGame)}
                />
              );
            })}
          </div>
        )
      ) : (
      <div className="pk-grid">
        {grid.map((id) => {
          const marks = unionFor(prog, id);
          const numberLabel = scope === "regional" && regional?.numbers[id] ? dexNum(regional.numbers[id]) : dexNum(id);
          return (
            <PokemonCard
              key={id}
              id={id}
              name={index.names[id]}
              types={index.types[id] || []}
              rarity={index.rarity[id]}
              numberLabel={numberLabel}
              caught={!!marks.caught}
              shiny={!!marks.shiny}
              caughtMale={!!marks.caughtMale}
              caughtFemale={!!marks.caughtFemale}
              shinyMale={!!marks.shinyMale}
              shinyFemale={!!marks.shinyFemale}
              games={marks.where}
              obtainable={obtainable[id]}
              dimUncaught={dimUncaught}
              unavailableLabel={notInGame(gameLabel(game))}
              onOpen={() => onOpen(id)}
              onToggleCaught={() => onToggleCaught(id)}
              onToggleShiny={() => onToggleShiny(id)}
              onMoveGame={(fromGame, toGame) => onMoveGame(id, null, fromGame, toGame)}
            />
          );
        })}
      </div>
      )}

      {!formList && !indexLoading && !(scope === "regional" && regionalLoading) && grid.length === 0 ? (
        <div className="pk-status">{m.dex.noResults}</div>
      ) : null}
      {formList && !formsLoading && formRows.length === 0 ? (
        <div className="pk-status">{m.dex.noResults}</div>
      ) : null}
    </div>
  );
}
