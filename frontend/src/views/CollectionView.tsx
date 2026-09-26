import { useEffect, useState } from "react";
import { Blueprint } from "../components/Blueprint";
import { CollectionToolbar } from "../components/CollectionToolbar";
import { PokeBallIcon } from "../components/PokeBallIcon";
import { PokemonCard } from "../components/PokemonCard";
import { fetchOwnedIndex, type OwnedIndexRow } from "../collectionApi";
import { buildCollectionEntries, collectionHeadCopy, filterCollectionEntries } from "../collectionList";
import { dexNum } from "../format";
import { useI18n } from "../i18n/context";
import { notInGame } from "../i18n/labels";
import type { CatalogForm } from "../pokeapi";
import { gameLabel } from "../progress";
import type { CollectionFilter, DexIndex, Progress } from "../types";
import type { SpeciesForm } from "../forms";

type CollectionViewProps = {
  index: DexIndex;
  indexLoading: boolean;
  prog: Progress;
  game: string;
  q: string;
  filter: CollectionFilter;
  originRegion: string | null;
  signedIn: boolean;
  forms: CatalogForm[];
  onQuery: (q: string) => void;
  onFilter: (filter: CollectionFilter) => void;
  onOriginRegion: (slug: string | null) => void;
  onOpen: (id: number) => void;
  onOpenForm: (id: number, form: SpeciesForm) => void;
  onToggleCaught: (id: number) => void;
  onToggleShiny: (id: number) => void;
  onToggleForm: (id: number, form: SpeciesForm, key: "caught" | "shiny") => void;
  onMoveGame: (id: number, form: SpeciesForm | null, fromGame: string, toGame: string) => void;
};

export function CollectionView({
  index,
  indexLoading,
  prog,
  game,
  q,
  filter,
  originRegion,
  signedIn,
  forms,
  onQuery,
  onFilter,
  onOriginRegion,
  onOpen,
  onOpenForm,
  onToggleCaught,
  onToggleShiny,
  onToggleForm,
  onMoveGame,
}: CollectionViewProps) {
  const { messages: m } = useI18n();
  const [owned, setOwned] = useState<OwnedIndexRow[]>([]);
  const [ownedLoading, setOwnedLoading] = useState(signedIn);

  useEffect(() => {
    if (!signedIn) {
      setOwned([]);
      setOwnedLoading(false);
      return;
    }
    let cancelled = false;
    setOwnedLoading(true);
    fetchOwnedIndex()
      .then((rows) => {
        if (!cancelled) {
          setOwned(rows || []);
          setOwnedLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOwned([]);
          setOwnedLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  const entries = buildCollectionEntries(prog, index, forms, owned);
  const grid = filterCollectionEntries(entries, filter, originRegion, q);
  const head = collectionHeadCopy(grid.length, entries.length, originRegion);
  const ready = !indexLoading && !ownedLoading;

  return (
    <div className="pk-page pk-dex pk-collection">
      <CollectionToolbar
        q={q}
        filter={filter}
        originRegion={originRegion}
        onQuery={onQuery}
        onFilter={onFilter}
        onOriginRegion={onOriginRegion}
      />

      <div className="pk-dex-head">
        <div className="pk-collection-heading">
          <h2>{head.title}</h2>
          <Blueprint className="pk-collection-legend">
            <PokeBallIcon caught kind="ultra" size={16} />
            <span>{m.collection.specimenHint}</span>
          </Blueprint>
        </div>
        <span>{head.meta}</span>
      </div>

      {indexLoading || (!ready && grid.length === 0) ? (
        <div className="pk-status">{m.collection.loading}</div>
      ) : (
        <div className="pk-grid">
          {grid.map((entry) => (
            <PokemonCard
              key={entry.key}
              id={entry.id}
              spriteId={entry.spriteId}
              formName={entry.formName}
              capturable={entry.capturable}
              name={entry.name}
              types={entry.types}
              rarity={index.rarity[entry.id]}
              numberLabel={dexNum(entry.id)}
              caught={entry.caught}
              shiny={entry.shiny}
              caughtMale={entry.caughtMale}
              caughtFemale={entry.caughtFemale}
              shinyMale={entry.shinyMale}
              shinyFemale={entry.shinyFemale}
              games={entry.games}
              obtainable
              dimUncaught={false}
              markedStyle={false}
              hasSpecimen={entry.hasSpecimen}
              specimenLabel={m.collection.specimen}
              unavailableLabel={notInGame(gameLabel(game))}
              onOpen={() => (entry.form ? onOpenForm(entry.id, entry.form) : onOpen(entry.id))}
              onToggleCaught={() => (entry.form ? onToggleForm(entry.id, entry.form, "caught") : onToggleCaught(entry.id))}
              onToggleShiny={() => (entry.form ? onToggleForm(entry.id, entry.form, "shiny") : onToggleShiny(entry.id))}
              onMoveGame={(fromGame, toGame) => onMoveGame(entry.id, entry.form, fromGame, toGame)}
            />
          ))}
        </div>
      )}

      {ready && entries.length === 0 ? <div className="pk-status">{m.collection.empty}</div> : null}
      {ready && entries.length > 0 && grid.length === 0 ? <div className="pk-status">{m.collection.noResults}</div> : null}
    </div>
  );
}
