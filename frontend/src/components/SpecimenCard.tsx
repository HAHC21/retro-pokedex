import type { OwnedMove, OwnedPokemon, StatBlock } from "../collectionApi";
import { NATURES, natureModifierLabel, natureName, type NatureInfo } from "../natures";
import { dexNum, kindStyle, spriteUrl, title } from "../format";
import { findMove } from "../moveCatalog";
import { fill, getMessages } from "../i18n/runtime";
import { IV_KEYS, IV_NATURE_STAT, calculateStats, ivLabel } from "../ownedStats";
import { MoveNameTag } from "./MoveNameTag";
import { PokeBallIcon } from "./PokeBallIcon";
import { TypeTag } from "./TypeTag";

export type SpecimenDisplay = Pick<
  OwnedPokemon,
  | "pokemon_id"
  | "nickname"
  | "level"
  | "gender"
  | "shiny"
  | "ability_name"
  | "nature"
  | "held_item"
  | "species_slug"
  | "source_type"
  | "ivs"
  | "evs"
  | "stats"
  | "moves"
> & {
  owned_id?: string;
  game_key?: string | null;
  raw_format?: string | null;
  ot_name?: string | null;
  ball?: string | null;
  met_game?: string | null;
  met_location?: string | null;
  met_level?: number | null;
  met_date?: string | null;
  fateful_encounter?: boolean;
  egg_location?: string | null;
  created_at?: string;
};

type AbilityHint = {
  name: string;
  is_hidden?: boolean;
};

type SpecimenCardProps = {
  specimen: SpecimenDisplay;
  types: string[];
  speciesName: string;
  abilities?: AbilityHint[];
  gameName?: string;
  preview?: boolean;
  busy?: boolean;
  onRemove?: () => void;
  baseStats?: StatBlock | null;
};

export function SpecimenCard({
  specimen,
  types,
  speciesName,
  abilities = [],
  gameName,
  preview = false,
  busy = false,
  onRemove,
  baseStats = null,
}: SpecimenCardProps) {
  const nature = natureOf(specimen.nature);
  const speciesLabel = specimen.species_slug ? title(specimen.species_slug) : speciesName;
  const displayName = specimen.nickname?.trim() || speciesLabel;
  const nicknamed = !!specimen.nickname?.trim() && displayName.toLowerCase() !== speciesLabel.toLowerCase();
  const hidden = abilities.some(
    (entry) => entry.name.toLowerCase() === (specimen.ability_name || "").toLowerCase() && entry.is_hidden,
  );
  const source = sourceLabel(specimen.source_type, specimen.raw_format);
  const stats =
    specimen.stats && hasAnyStat(specimen.stats)
      ? specimen.stats
      : baseStats && specimen.level
        ? calculateStats(baseStats, specimen.ivs, specimen.evs, specimen.level, nature)
        : null;
  const moves = (specimen.moves || []).slice().sort((left, right) => left.slot - right.slot);
  const statMax = stats ? Math.max(255, ...IV_KEYS.map((key) => Number(stats[key] ?? 0))) : 255;

  return (
    <article className={specimen.shiny ? "pk-specimen is-shiny" : "pk-specimen"}>
      <PokeBallIcon caught />
      <header className="pk-specimen-head">
        <div className="pk-identity-meta">
          <span className="tag pk-dex-box">{dexNum(specimen.pokemon_id)}</span>
          <div className="pk-types pk-identity-types">
            {types.map((type) => (
              <TypeTag key={type} type={type} />
            ))}
          </div>
        </div>
        <div className="pk-specimen-badges">
          <span className="tag" style={kindStyle(specimen.shiny ? "Shiny" : "Normal")}>
            {specimen.shiny ? "Shiny" : "Normal"}
          </span>
          {specimen.fateful_encounter ? <span className="tag pk-specimen-fateful">{getMessages().specimens.fateful}</span> : null}
          {specimen.level != null ? <span className="tag pk-specimen-level">{fill(getMessages().specimens.levelShort, { level: specimen.level })}</span> : null}
          {genderLabel(specimen.gender) ? <span className="tag pk-specimen-gender">{genderLabel(specimen.gender)}</span> : null}
        </div>
      </header>

      <div className="pk-specimen-title">
        <h4>{displayName}</h4>
        {nicknamed ? <span className="pk-specimen-species">{speciesLabel}</span> : null}
      </div>

      <div className="pk-specimen-body">
        <figure className="pk-specimen-sprite">
          <img src={spriteUrl(specimen.pokemon_id, specimen.shiny)} alt={displayName} />
          <figcaption>{specimen.shiny ? getMessages().marks.shiny : getMessages().marks.normal}</figcaption>
        </figure>
        <div className="pk-specimen-panels">
          <section className="pk-specimen-panel">
            <dl className="pk-specimen-facts">
              <Fact label={getMessages().specimens.ability} value={specimen.ability_name ? title(specimen.ability_name) : "—"} note={hidden ? getMessages().detail.hidden : null} />
              <Fact
                label={getMessages().specimens.nature}
                value={nature ? natureName(nature.name) : specimen.nature || "—"}
                note={nature ? natureModifierLabel(nature) : null}
              />
              <Fact label={getMessages().specimens.held} value={specimen.held_item ? title(specimen.held_item) : getMessages().specimens.none} />
              <Fact label="OT" value={specimen.ot_name?.trim() || "—"} />
              <Fact label="Ball" value={specimen.ball || "—"} />
            </dl>
          </section>
          <section className="pk-specimen-panel">
            <dl className="pk-specimen-facts">
              <Fact label="Save" value={gameName || "—"} />
              <Fact label="Origin" value={source} />
              <Fact label={getMessages().specimens.metIn} value={specimen.met_game || "—"} />
              <Fact label={getMessages().specimens.metLocation} value={specimen.met_location || "—"} />
              <Fact label={getMessages().specimens.metLevel} value={specimen.met_level != null ? String(specimen.met_level) : "—"} />
              <Fact label={getMessages().specimens.metDate} value={formatMetDate(specimen.met_date)} />
              {specimen.egg_location ? <Fact label={getMessages().specimens.eggFrom} value={specimen.egg_location} /> : null}
            </dl>
          </section>
        </div>
      </div>

      <div className="pk-specimen-spreads">
        {stats ? <StatSpread label="Stats" block={stats} max={statMax} nature={nature} /> : null}
        <StatSpread label={getMessages().specimens.ivSpread} block={specimen.ivs} max={31} nature={nature} />
        <StatSpread label={getMessages().specimens.evSpread} block={specimen.evs} max={252} nature={nature} />
      </div>

      <div className="pk-specimen-moves-wrap">
        <span className="pk-traits-label">{getMessages().specimens.moves}</span>
        <div className="pk-specimen-moves" aria-label={getMessages().specimens.moves}>
          {[0, 1, 2, 3].map((slot) => (
            <MoveSlot key={slot} move={moves.find((entry) => entry.slot === slot) ?? null} />
          ))}
        </div>
      </div>

      {preview || onRemove ? (
        <footer className="pk-specimen-foot">
          {preview ? <span className="pk-specimen-origin">{getMessages().specimens.ready}</span> : null}
          {onRemove ? (
            <button type="button" className="btn btn-ghost pk-nav" disabled={busy} onClick={onRemove}>
              {getMessages().specimens.release}
            </button>
          ) : null}
        </footer>
      ) : null}
    </article>
  );
}

function hasAnyStat(block: StatBlock): boolean {
  return IV_KEYS.some((key) => block[key] != null);
}

function MoveSlot({ move }: { move: OwnedMove | null }) {
  if (!move?.name && !move?.move_id) {
    return (
      <span className="pk-move-row">
        <MoveNameTag name="Empty" type={null} damageClass={null} />
        <span className="pk-move-meta">—</span>
      </span>
    );
  }
  const catalog = findMove(move.move_id, move.name);
  const ups = move.pp_ups ?? 0;
  const maxPp = catalog ? Math.floor((catalog.pp * (5 + ups)) / 5) : null;
  const pp = move.pp ?? maxPp;
  const ppLabel = pp == null ? "—" : maxPp != null ? `PP ${pp}/${maxPp}` : `PP ${pp}`;
  return (
    <span className="pk-move-row">
      <MoveNameTag
        name={move.name ? title(move.name) : `Move ${move.move_id}`}
        type={catalog?.type ? catalog.type.toLowerCase() : null}
        damageClass={catalog?.class ? catalog.class.toLowerCase() : null}
      />
      <span className="pk-move-meta">{ppLabel}</span>
    </span>
  );
}

function Fact({ label, value, note }: { label: string; value: string; note?: string | null }) {
  return (
    <div className="pk-specimen-fact">
      <dt>{label}</dt>
      <dd>
        <strong>{value}</strong>
        {note ? <span>{note}</span> : null}
      </dd>
    </div>
  );
}

function StatSpread({
  label,
  block,
  max,
  nature,
}: {
  label: string;
  block: StatBlock | null;
  max: number;
  nature?: NatureInfo;
}) {
  return (
    <div className="pk-specimen-spread">
      <span className="pk-traits-label">{label}</span>
      {IV_KEYS.map((key) => {
        const value = block?.[key] ?? null;
        const pct = value == null ? 0 : Math.min(100, Math.round((Number(value) / max) * 100));
        const natureStat = IV_NATURE_STAT[key];
        const plus = !!natureStat && nature?.plus === natureStat;
        const minus = !!natureStat && nature?.minus === natureStat;
        const className = ["pk-stat-row", "pk-specimen-stat", plus ? "is-plus" : "", minus ? "is-minus" : ""]
          .filter(Boolean)
          .join(" ");
        return (
          <div key={key} className={className}>
            <span>{ivLabel(key)}</span>
            <span className="pk-bar">
              <span className="pk-bar-fill" style={{ width: `${pct}%` }} />
            </span>
            <span>{value == null ? "—" : value}</span>
          </div>
        );
      })}
    </div>
  );
}

function natureOf(name: string | null): NatureInfo | undefined {
  if (!name) {
    return undefined;
  }
  return NATURES.find((entry) => entry.name.toLowerCase() === name.toLowerCase());
}

function genderLabel(gender: string | null): string | null {
  if (gender === "male") {
    return getMessages().specimens.male;
  }
  if (gender === "female") {
    return getMessages().specimens.female;
  }
  if (gender === "genderless") {
    return getMessages().specimens.genderless;
  }
  return null;
}

function sourceLabel(sourceType: string, rawFormat?: string | null): string {
  const copy = getMessages().specimens;
  if (sourceType === "pk") {
    return rawFormat ? fill(copy.pkNamed, { format: rawFormat }) : copy.pk;
  }
  if (sourceType === "sav") {
    return copy.saveFile;
  }
  return copy.manual;
}

function formatMetDate(value?: string | null): string {
  if (!value) {
    return "—";
  }
  const stamp = Date.parse(`${value}T00:00:00`);
  if (!Number.isFinite(stamp)) {
    return value;
  }
  return new Date(stamp).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
