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
import { IV_KEYS, IV_LABELS, emptyIvs } from "../ownedStats";
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
          setError(err instanceof Error ? err.message : "Could not load owned Pokémon.");
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
      setError(err instanceof Error ? err.message : "Could not add Pokémon.");
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
          `This file is National Dex #${parsed.pokemon_id}, but this page is #${pokemonId}. Open the matching species to upload it.`,
        );
      }
      setUploadPreview({
        ...parsed,
        species_slug: speciesSlug,
      });
    } catch (err) {
      setUploadFile(null);
      setError(err instanceof Error ? err.message : "Could not parse Pokémon file.");
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
      setUploadMessage("Specimen saved from decrypted PK data.");
      setUploadFile(null);
      setUploadPreview(null);
      await refresh();
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save uploaded Pokémon.");
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
      setError(err instanceof Error ? err.message : "Could not remove Pokémon.");
    } finally {
      setBusy(false);
    }
  }

  const speciesName = title(speciesSlug);

  if (!signedIn) {
    return (
      <Blueprint className="pk-owned">
        <h3>Your specimens</h3>
        <div className="pk-owned-empty">
          <img src={spriteUrl(pokemonId)} alt="" className="pk-owned-empty-sprite is-dim" />
          <p className="pk-owned-note">
            Sign in to open this species’ trainer file. Uploaded PK files are assigned to the game they were met in, not
            the save currently selected in the header.
          </p>
        </div>
      </Blueprint>
    );
  }

  return (
    <Blueprint className="pk-owned">
      <div className="pk-owned-head">
        <h3>Your specimens</h3>
        <div className="pk-owned-actions">
          <button type="button" className="btn pk-nav" disabled={busy} onClick={() => setModal("add")}>
            Add specimen
          </button>
          <button type="button" className="btn pk-nav" disabled={busy} onClick={() => setModal("upload")}>
            Upload specimen
          </button>
        </div>
      </div>
      <p className="pk-owned-note">
        Every registered catch for this species, across all saves. PK uploads use the origin game in the file (for
        example SoulSilver stays on HeartGold / SoulSilver even if Red / Blue is selected).
      </p>
      {error && modal === null ? <p className="pk-spawn-empty">{error}</p> : null}
      {loading ? <p className="pk-none">Loading trainer file…</p> : null}
      {!loading && !items.length ? (
        <div className="pk-owned-empty">
          <img src={spriteUrl(pokemonId)} alt="" className="pk-owned-empty-sprite is-dim" />
          <p className="pk-none">No specimens recorded yet. Add one by hand or upload a PK file.</p>
        </div>
      ) : null}
      {items.length
        ? groupSpecimens(items).map((group) => (
            <section key={group.gameKey || "none"} className="pk-owned-group">
              <h4>{group.gameKey ? gameLabel(group.gameKey) : "Unassigned"}</h4>
              <ul className="pk-owned-list">
                {group.items.map((item) => (
                  <li key={item.owned_id}>
                    <SpecimenCard
                      specimen={item}
                      types={types}
                      speciesName={speciesName}
                      abilities={abilities}
                      gameName={item.game_key ? gameLabel(item.game_key) : "Unassigned"}
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

      <Modal open={modal === "add"} title="Add specimen" onClose={closeModal} size="wide">
        <form className="pk-owned-form" onSubmit={onAdd}>
          <p className="pk-owned-note">Manual entry for {gameName}.</p>
          {error && modal === "add" ? <p className="pk-spawn-empty">{error}</p> : null}
          <label className="field pk-field">
            <span>Form</span>
            <select className="input" value={shiny ? "shiny" : "normal"} onChange={(event) => setShiny(event.target.value === "shiny")}>
              <option value="normal">Normal</option>
              <option value="shiny">Shiny</option>
            </select>
          </label>
          <label className="field pk-field">
            <span>Gender</span>
            <select className="input" value={gender} onChange={(event) => setGender(event.target.value)}>
              <option value="">Unknown</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="genderless">Genderless</option>
            </select>
          </label>
          <label className="field pk-field">
            <span>Nickname</span>
            <input className="input" value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength={40} />
          </label>
          <label className="field pk-field">
            <span>Level</span>
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
            <span>Ability</span>
            <select className="input" value={abilityName} onChange={(event) => setAbilityName(event.target.value)} required>
              {abilities.map((entry) => (
                <option key={`${entry.slot}-${entry.name}`} value={entry.name}>
                  {title(entry.name)}
                  {entry.is_hidden ? " (Hidden)" : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="field pk-field">
            <span>Nature</span>
            <select className="input" value={nature} onChange={(event) => setNature(event.target.value)} required>
              {NATURES.map((entry) => (
                <option key={entry.name} value={entry.name}>
                  {entry.name}
                </option>
              ))}
            </select>
          </label>
          <StatFields label="IVs (0–31)" values={ivs} max={31} onChange={setIvs} />
          <StatFields label="EVs (0–252)" values={evs} max={252} onChange={setEvs} />
          <div className="dialog-actions">
            <button type="button" className="btn pk-nav" disabled={busy} onClick={closeModal}>
              Cancel
            </button>
            <button type="submit" className="btn pk-nav" disabled={busy}>
              {busy ? "Saving…" : "Save specimen"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={modal === "upload"} title="Upload specimen" onClose={closeModal} size="xl">
        <form className="pk-owned-form pk-upload-form" onSubmit={onUpload}>
          <div className="pk-upload-intro">
            <p className="pk-owned-note">
              Choose a .pk* / .pb7 file. It is decrypted in your browser. The specimen is assigned to the game stored in
              the file (met/origin), not {gameName}, unless that data is missing.
            </p>
            <label className="field pk-field pk-upload-file">
              <span>PK file</span>
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
              Cancel
            </button>
            <button type="submit" className="btn pk-nav" disabled={busy || !uploadPreview}>
              {busy ? "Saving…" : "Save specimen"}
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
            <span>{IV_LABELS[key]}</span>
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
