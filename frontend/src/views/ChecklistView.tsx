import { useEffect, useState } from "react";
import { Blueprint } from "../components/Blueprint";
import { boxClass } from "../rarity";
import { DexToolbar } from "../components/DexToolbar";
import { MarkToggles } from "../components/MarkToggles";
import { GenderSprites } from "../components/GenderSprites";
import { acquisitionFallback, resolveAcquisitionForIds } from "../acquisition";
import { versionLabel } from "../catalog";
import { CHECKLIST_STATUSES, dexCandidateIds, dexHeadCopy, filterDexIds } from "../dexList";
import { dexNum, navBtnStyle } from "../format";
import { resolveExclusiveVersionsForIds } from "../obtainability";
import type { RegionalDex } from "../pokeapi";
import { gameLabel, unionFor } from "../progress";
import type { DexIndex, DexScope, Progress, StatusFilter } from "../types";

type ChecklistViewProps = {
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
  obtainable: Record<number, boolean>;
  onQuery: (q: string) => void;
  onStatus: (status: StatusFilter) => void;
  onScope: (scope: DexScope) => void;
  onOpen: (id: number) => void;
  onSpawns: (id: number) => void;
  onToggleCaught: (id: number) => void;
  onToggleShiny: (id: number) => void;
};

export function ChecklistView({
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
  obtainable,
  onQuery,
  onStatus,
  onScope,
  onOpen,
  onSpawns,
  onToggleCaught,
  onToggleShiny,
}: ChecklistViewProps) {
  const [methods, setMethods] = useState<Record<number, string>>({});
  const [exclusives, setExclusives] = useState<Record<number, string | null>>({});
  const candidateIds = dexCandidateIds(scope, game, regional, gen, region);
  const listed = filterDexIds(candidateIds, index, prog, status, q);
  const rows = status === "exclusives" ? listed.filter((id) => exclusives[id]) : listed;
  const exclusivesPending = status === "exclusives" && listed.some((id) => exclusives[id] === undefined);
  const head = dexHeadCopy(scope, game, rows.length, candidateIds.length, "checklist", gen, region);

  useEffect(() => {
    setMethods({});
    setExclusives({});
  }, [game, gen, region, q, scope, regional, index]);

  useEffect(() => {
    const ids = filterDexIds(dexCandidateIds(scope, game, regional, gen, region), index, prog, status, q);
    if (!ids.length) {
      return;
    }
    let cancelled = false;
    resolveAcquisitionForIds(ids, game, (pokemonId, text) => {
      if (cancelled) {
        return;
      }
      setMethods((prev) => (prev[pokemonId] === text ? prev : { ...prev, [pokemonId]: text }));
    }).catch(() => {
      /* ignore */
    });
    resolveExclusiveVersionsForIds(ids, game, (pokemonId, version) => {
      if (cancelled) {
        return;
      }
      setExclusives((prev) => (prev[pokemonId] === version ? prev : { ...prev, [pokemonId]: version }));
    }).catch(() => {
      /* ignore */
    });
    return () => {
      cancelled = true;
    };
  }, [game, gen, region, q, status, scope, regional, index]);

  return (
    <div className="pk-page pk-dex pk-checklist">
      <DexToolbar
        game={game}
        gen={gen}
        region={region}
        q={q}
        status={status}
        scope={scope}
        statuses={CHECKLIST_STATUSES}
        onQuery={onQuery}
        onStatus={onStatus}
        onScope={onScope}
      />

      <div className="pk-dex-head">
        <h2>{head.title}</h2>
        <span>{head.meta}</span>
      </div>

      {indexLoading || (scope === "regional" && regionalLoading) ? (
        <div className="pk-status">{scope === "regional" ? "Loading regional Pokédex…" : "Loading index from PokéAPI…"}</div>
      ) : null}

      <div className="pk-check-list">
        {rows.map((id) => {
          const marks = unionFor(prog, id);
          const marked = !!(marks.caught || marks.shiny);
          const available = obtainable[id];
          const numberLabel = scope === "regional" && regional?.numbers[id] ? dexNum(regional.numbers[id]) : dexNum(id);
          const raw = methods[id];
          const method =
            raw === undefined ? "Checking…" : acquisitionFallback(id, game, available, raw);
          const exclusiveKey = exclusives[id];
          const exclusiveName = exclusiveKey ? versionLabel(exclusiveKey) : null;
          return (
            <Blueprint key={id} className={boxClass("pk-check-row", marked, index.rarity[id])}>
              <button type="button" className="pk-nav pk-check-id" onClick={() => onOpen(id)}>
                {numberLabel}
              </button>
              <button type="button" className="pk-nav pk-check-sprite-btn" onClick={() => onOpen(id)}>
                <GenderSprites
                  pokemonId={id}
                  shiny={!!marks.shiny && !(marks.caughtMale && marks.caughtFemale)}
                  male={!!(marks.caughtMale && marks.caughtFemale ? true : marks.shiny ? marks.shinyMale : marks.caughtMale)}
                  female={!!(marks.caughtMale && marks.caughtFemale ? true : marks.shiny ? marks.shinyFemale : marks.caughtFemale)}
                  alt=""
                  loading="lazy"
                  className={marked ? "pk-check-sprite" : "pk-check-sprite is-dim"}
                />
              </button>
              <button type="button" className="pk-nav pk-check-name" onClick={() => onOpen(id)}>
                {index.names[id]}
              </button>
              <span className="pk-check-method">
                {exclusiveName ? <span className="pk-check-exclusive">Exclusive to {exclusiveName}</span> : null}
                <span className="pk-check-method-text">{method}</span>
              </span>
              <span className="pk-check-actions">
                <button type="button" className="btn pk-nav pk-check-spawns" style={navBtnStyle(false)} onClick={() => onSpawns(id)}>
                  SPAWNS
                </button>
                <span className="pk-check-action-rule" aria-hidden="true" />
                <MarkToggles
                  caught={!!marks.caught}
                  shiny={!!marks.shiny}
                  available={available}
                  unavailableLabel={`Not In ${gameLabel(game)}`}
                  onCaught={() => onToggleCaught(id)}
                  onShiny={() => onToggleShiny(id)}
                />
              </span>
            </Blueprint>
          );
        })}
      </div>

      {!indexLoading && !(scope === "regional" && regionalLoading) && exclusivesPending && rows.length === 0 ? (
        <div className="pk-status">Finding version exclusives…</div>
      ) : null}

      {!indexLoading && !(scope === "regional" && regionalLoading) && !exclusivesPending && rows.length === 0 ? (
        <div className="pk-status">No results for these filters</div>
      ) : null}
    </div>
  );
}
