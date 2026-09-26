import { FormEvent, useEffect, useRef, useState } from "react";
import { Blueprint } from "./Blueprint";
import { Modal } from "./Modal";
import { SpecimenCard } from "./SpecimenCard";
import {
  createOwnedPokemon,
  deleteOwnedPokemon,
  fetchOwnedPokemon,
  uploadParsedOwnedPokemon,
  type OwnedPokemon,
  type StatBlock,
} from "../collectionApi";
import { spriteUrl, title } from "../format";
import { NATURES } from "../natures";
import { useI18n } from "../i18n/context";
import { natureName } from "../natures";
import { IV_KEYS, emptyIvs, ivLabel } from "../ownedStats";
import { parsePkFile, type ParsedPkSpecimen } from "../pkParse";
import { GAMES } from "../catalog";
import { gameLabel } from "../progress";

type AbilityOption = {
  name: string;
  slot?: number;
  is_hidden?: boolean;
};

type OwnedCollectionPanelProps = {
  pokemonId: number;
  speciesSlug: string;
  types: string[];
  game: string;
  gameName: string;
  signedIn: boolean;
  abilities: AbilityOption[];
  baseStats?: StatBlock | null;
  onChanged: () => void;
  onCollectedTraits: (abilities: string[], natures: string[]) => void;
};

const PK_ACCEPT = ".pk1,.pk2,.pk3,.pk4,.pk5,.pk6,.pk7,.pk8,.pk9,.pb7";

export function OwnedCollectionPanel({
  pokemonId,
  speciesSlug,
  types,
  game,
  gameName,
  signedIn,
  abilities,
  baseStats = null,
  onChanged,
  onCollectedTraits,
}: OwnedCollectionPanelProps) {
  const { messages: m, fill } = useI18n();
  const [items, setItems] = useState<OwnedPokemon[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<"add" | "upload" | null>(null);
  const [shiny, setShiny] = useState(false);
  const [gender, setGender] = useState("");
  const [nickname, setNickname] = useState("");
  const [level, setLevel] = useState("50");
  const [abilityName, setAbilityName] = useState(abilities[0]?.name || "");
  const [nature, setNature] = useState(NATURES[0]?.name || "Hardy");
  const [ivs, setIvs] = useState<StatBlock>(emptyIvs);
  const [evs, setEvs] = useState<StatBlock>(emptyIvs);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<ParsedPkSpecimen | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const onCollectedTraitsRef = useRef(onCollectedTraits);
  onCollectedTraitsRef.current = onCollectedTraits;

  useEffect(() => {
    if (!signedIn) {
      setItems([]);
      onCollectedTraitsRef.current([], []);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchOwnedPokemon(pokemonId)
      .then((payload) => {
        if (cancelled || !payload) {
          return;
        }
        setItems(payload.items);
        onCollectedTraitsRef.current(payload.collected_abilities, payload.collected_natures);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : m.specimens.loadFailed);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [signedIn, pokemonId]);

  useEffect(() => {
    if (!abilityName && abilities[0]?.name) {
      setAbilityName(abilities[0].name);
    }
  }, [abilities, abilityName]);

  function closeModal() {
    setModal(null);
    setUploadFile(null);
    setUploadPreview(null);
    setUploadMessage(null);
    setError(null);
  }

  function resetAddForm() {
    setNickname("");
    setShiny(false);
    setGender("");
    setLevel("50");
    setAbilityName(abilities[0]?.name || "");
    setNature(NATURES[0]?.name || "Hardy");
    setIvs(emptyIvs());
    setEvs(emptyIvs());
  }

  async function refresh() {
    const payload = await fetchOwnedPokemon(pokemonId);
    if (!payload) {
      return;
    }
    setItems(payload.items);
    onCollectedTraitsRef.current(payload.collected_abilities, payload.collected_natures);
    onChanged();
  }

  async function onAdd(event: FormEvent) {
    event.preventDefault();
    if (!signedIn) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const ability = abilities.find((entry) => entry.name === abilityName);
      await createOwnedPokemon({
        pokemon_id: pokemonId,
        game_key: game,
        species_slug: speciesSlug,
        nickname: nickname.trim() || null,
        level: level ? Number(level) : null,
        shiny,
        gender: gender || null,
        ability_name: abilityName || null,
        ability_slot: ability?.slot ?? null,
        nature: nature || null,
        ivs,
        evs,
      });
      resetAddForm();
      closeModal();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : m.specimens.addFailed);
    } finally {
      setBusy(false);
    }
  }

  async function onPickUpload(file: File | null) {
    setUploadFile(file);
    setUploadPreview(null);
    setUploadMessage(null);
    setError(null);
    if (!file) {
      return;
    }
    setBusy(true);
    try {
      const parsed = await parsePkFile(file, game);
      if (parsed.pokemon_id !== pokemonId) {
        throw new Error(
          fill(m.specimens.wrongFile, { file: parsed.pokemon_id, page: pokemonId }),
        );
      }
      setUploadPreview({
        ...parsed,
        species_slug: speciesSlug,
      });
    } catch (err) {
      setUploadFile(null);
      setError(err instanceof Error ? err.message : m.specimens.parseFailed);
    } finally {
      setBusy(false);
    }
  }

  async function onUpload(event: FormEvent) {
    event.preventDefault();
    if (!signedIn || !uploadPreview || !uploadFile) {
      return;
    }
    setBusy(true);
    setError(null);
    setUploadMessage(null);
    try {
      await uploadParsedOwnedPokemon({
        ...uploadPreview,
        filename: uploadFile.name,
      });
      setUploadMessage(m.specimens.saved);
      setUploadFile(null);
      setUploadPreview(null);
      await refresh();
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : m.specimens.saveFailed);
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(ownedId: string) {
    setBusy(true);
    setError(null);
    try {
      await deleteOwnedPokemon(ownedId);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : m.specimens.removeFailed);
    } finally {
      setBusy(false);
    }
  }

  const speciesName = title(speciesSlug);

  if (!signedIn) {
    return (
      <Blueprint className="pk-owned">
        <h3>{m.specimens.title}</h3>
        <div className="pk-owned-empty">
          <img src={spriteUrl(pokemonId)} alt="" className="pk-owned-empty-sprite is-dim" />
          <p className="pk-owned-note">
            {m.specimens.signIn}
          </p>
        </div>
      </Blueprint>
    );
  }

  return (
    <Blueprint className="pk-owned">
      <div className="pk-owned-head">
        <h3>{m.specimens.title}</h3>
        <div className="pk-owned-actions">
          <button type="button" className="btn pk-nav" disabled={busy} onClick={() => setModal("add")}>
            {m.specimens.add}
          </button>
          <button type="button" className="btn pk-nav" disabled={busy} onClick={() => setModal("upload")}>
            {m.specimens.upload}
          </button>
        </div>
      </div>
      <p className="pk-owned-note">{m.specimens.note}</p>
      {error && modal === null ? <p className="pk-spawn-empty">{error}</p> : null}
      {loading ? <p className="pk-none">{m.specimens.loading}</p> : null}
      {!loading && !items.length ? (
        <div className="pk-owned-empty">
          <img src={spriteUrl(pokemonId)} alt="" className="pk-owned-empty-sprite is-dim" />
          <p className="pk-none">{m.specimens.empty}</p>
        </div>
      ) : null}
      {items.length
        ? groupSpecimens(items).map((group) => (
            <section key={group.gameKey || "none"} className="pk-owned-group">
              <h4>{group.gameKey ? gameLabel(group.gameKey) : m.specimens.unassigned}</h4>
              <ul className="pk-owned-list">
                {group.items.map((item) => (
                  <li key={item.owned_id}>
                    <SpecimenCard
                      specimen={item}
                      types={types}
                      speciesName={speciesName}
                      abilities={abilities}
                      gameName={item.game_key ? gameLabel(item.game_key) : m.specimens.unassigned}
                      baseStats={baseStats}
                      busy={busy}
                      onRemove={() => void onRemove(item.owned_id)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))
        : null}

      <Modal open={modal === "add"} title={m.specimens.add} onClose={closeModal} size="wide">
        <form className="pk-owned-form" onSubmit={onAdd}>
          <p className="pk-owned-note">{fill(m.specimens.manualFor, { game: gameName })}</p>
          {error && modal === "add" ? <p className="pk-spawn-empty">{error}</p> : null}
          <label className="field pk-field">
            <span>{m.specimens.form}</span>
            <select className="input" value={shiny ? "shiny" : "normal"} onChange={(event) => setShiny(event.target.value === "shiny")}>
              <option value="normal">{m.marks.normal}</option>
              <option value="shiny">{m.marks.shiny}</option>
            </select>
          </label>
          <label className="field pk-field">
            <span>{m.specimens.gender}</span>
            <select className="input" value={gender} onChange={(event) => setGender(event.target.value)}>
              <option value="">{m.specimens.unknown}</option>
              <option value="male">{m.marks.male}</option>
              <option value="female">{m.marks.female}</option>
              <option value="genderless">{m.specimens.genderless}</option>
            </select>
          </label>
          <label className="field pk-field">
            <span>{m.specimens.nickname}</span>
            <input className="input" value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength={40} />
          </label>
          <label className="field pk-field">
            <span>{m.specimens.level}</span>
            <input
              className="input"
              type="number"
              min={1}
              max={100}
              value={level}
              onChange={(event) => setLevel(event.target.value)}
            />
          </label>
          <label className="field pk-field">
            <span>{m.specimens.ability}</span>
            <select className="input" value={abilityName} onChange={(event) => setAbilityName(event.target.value)} required>
              {abilities.map((entry) => (
                <option key={`${entry.slot}-${entry.name}`} value={entry.name}>
                  {title(entry.name)}
                  {entry.is_hidden ? ` (${m.detail.hidden})` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="field pk-field">
            <span>{m.specimens.nature}</span>
            <select className="input" value={nature} onChange={(event) => setNature(event.target.value)} required>
              {NATURES.map((entry) => (
                <option key={entry.name} value={entry.name}>
                  {natureName(entry.name)}
                </option>
              ))}
            </select>
          </label>
          <StatFields label={m.specimens.ivs} values={ivs} max={31} onChange={setIvs} />
          <StatFields label={m.specimens.evs} values={evs} max={252} onChange={setEvs} />
          <div className="dialog-actions">
            <button type="button" className="btn pk-nav" disabled={busy} onClick={closeModal}>
              {m.specimens.cancel}
            </button>
            <button type="submit" className="btn pk-nav" disabled={busy}>
              {busy ? m.specimens.saving : m.specimens.save}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={modal === "upload"} title={m.specimens.upload} onClose={closeModal} size="xl">
        <form className="pk-owned-form pk-upload-form" onSubmit={onUpload}>
          <div className="pk-upload-intro">
            <p className="pk-owned-note">
              {fill(m.specimens.uploadHelp, { game: gameName })}
            </p>
            <label className="field pk-field pk-upload-file">
              <span>{m.specimens.pkFile}</span>
              <input
                className="input"
                type="file"
                accept={PK_ACCEPT}
                onChange={(event) => {
                  void onPickUpload(event.target.files?.[0] ?? null);
                }}
              />
            </label>
          </div>
          {error && modal === "upload" ? <p className="pk-spawn-empty">{error}</p> : null}
          {uploadMessage ? <p className="pk-owned-note">{uploadMessage}</p> : null}
          {uploadPreview ? (
            <SpecimenCard
              specimen={toPreviewSpecimen(uploadPreview, pokemonId, speciesSlug)}
              types={types}
              speciesName={speciesName}
              abilities={abilities}
              gameName={gameLabel(uploadPreview.game_key || game)}
              baseStats={baseStats}
              preview
            />
          ) : null}
          <div className="dialog-actions">
            <button type="button" className="btn pk-nav" disabled={busy} onClick={closeModal}>
              {m.specimens.cancel}
            </button>
            <button type="submit" className="btn pk-nav" disabled={busy || !uploadPreview}>
              {busy ? m.specimens.saving : m.specimens.save}
            </button>
          </div>
        </form>
      </Modal>
    </Blueprint>
  );
}

function StatFields({
  label,
  values,
  max,
  onChange,
}: {
  label: string;
  values: StatBlock;
  max: number;
  onChange: (next: StatBlock) => void;
}) {
  return (
    <div className="pk-owned-stat-block">
      <span className="pk-traits-label">{label}</span>
      <div className="pk-owned-stat-grid">
        {IV_KEYS.map((key) => (
          <label key={key} className="field pk-field">
            <span>{ivLabel(key)}</span>
            <input
              className="input"
              type="number"
              min={0}
              max={max}
              value={values[key] ?? ""}
              onChange={(event) => {
                const raw = event.target.value;
                onChange({
                  ...values,
                  [key]: raw === "" ? null : Number(raw),
                });
              }}
            />
          </label>
        ))}
      </div>
    </div>
  );
}

function toPreviewSpecimen(parsed: ParsedPkSpecimen, pokemonId: number, speciesSlug: string) {
  return {
    pokemon_id: pokemonId,
    game_key: parsed.game_key ?? null,
    nickname: parsed.nickname ?? null,
    level: parsed.level ?? null,
    gender: parsed.gender ?? null,
    shiny: !!parsed.shiny,
    ability_name: parsed.ability_name ?? null,
    nature: parsed.nature ?? null,
    held_item: parsed.held_item ?? null,
    ball: parsed.ball ?? null,
    species_slug: speciesSlug,
    source_type: parsed.source_type || "pk",
    raw_format: parsed.raw_format,
    ot_name: parsed.ot_name ?? null,
    met_game: parsed.met_game ?? null,
    met_location: parsed.met_location ?? null,
    met_level: parsed.met_level ?? null,
    met_date: parsed.met_date ?? null,
    fateful_encounter: !!parsed.fateful_encounter,
    egg_location: parsed.egg_location ?? null,
    moves: parsed.moves ?? [],
    ivs: parsed.ivs ?? null,
    evs: parsed.evs ?? null,
    stats: parsed.stats ?? null,
  };
}

function groupSpecimens(items: OwnedPokemon[]): Array<{ gameKey: string | null; items: OwnedPokemon[] }> {
  const order = new Map(GAMES.map((entry, index) => [entry.k, index]));
  const buckets = new Map<string, OwnedPokemon[]>();
  items.forEach((item) => {
    const key = item.game_key || "_none";
    const group = buckets.get(key) || [];
    group.push(item);
    buckets.set(key, group);
  });
  return [...buckets.entries()]
    .sort((left, right) => {
      const leftRank = left[0] === "_none" ? 999 : (order.get(left[0]) ?? 500);
      const rightRank = right[0] === "_none" ? 999 : (order.get(right[0]) ?? 500);
      return leftRank - rightRank;
    })
    .map(([key, grouped]) => ({ gameKey: key === "_none" ? null : key, items: grouped }));
}
