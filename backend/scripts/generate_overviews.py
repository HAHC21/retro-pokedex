"""Generate ~150-word Pokémon lore overviews with Gemini and store them in MongoDB.

Usage (from backend/ with venv active and GEMINI_API_KEY + MONGODB_URI set):

    python -m scripts.generate_overviews
    python -m scripts.generate_overviews --force
    python -m scripts.generate_overviews --start 1 --end 10
    python -m scripts.generate_overviews --id 1
    python -m scripts.generate_overviews --lang es
    python -m scripts.generate_overviews --forms
    python -m scripts.generate_overviews --variants
"""

from __future__ import annotations

import argparse
import asyncio
import csv
import re
import sys
from pathlib import Path

# Allow `python -m scripts.generate_overviews` from backend/
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import settings
from app.db.mongo import connect_mongo, disconnect_mongo
from app.dependencies import get_gemini_client, get_pokeapi_client, shutdown_external_clients
from app.integrations.gemini.client import GeminiUsage
from app.catalog.pokemon_form import form_key, variant_display_name
from app.repositories.pokemon_form_repository import PokemonRepository, _stats_from_payload, types_from_payload
from app.repositories.pokemon_overview_repository import PokemonOverviewRepository

EXAMPLE_OVERVIEW = (
    "Bulbasaur is a dual-type Grass/Poison Pokémon introduced in Generation I as one of "
    "the original starter Pokémon of the Kanto region. A small, quadrupedal reptilian "
    "creature with blue-green skin and darker patches, it is defined by the large plant "
    "bulb planted firmly on its back. This bulb shares a symbiotic relationship with "
    "Bulbasaur, growing steadily larger by soaking up sunlight through photosynthesis as "
    "the Pokémon absorbs nutrients. In battle and in the wild, Bulbasaur uses the bulb to "
    "store energy and deploy versatile grass-based attacks, including extendable vine "
    "whips and nutrient-draining seeds. Known for its docile, loyal nature, Bulbasaur is "
    "frequently chosen by young Trainers for its stability and adaptability in early "
    "journeys. Naturally residing in temperate grasslands and hidden forests, it often "
    "rests in bright sunlight to gather energy. As the initial entry in the National "
    "Pokédex, Bulbasaur symbolizes the foundational balance of nature and growth."
)

EXAMPLE_OVERVIEW_ES = (
    "Bulbasaur es un Pokémon de tipo Planta/Veneno introducido en la primera generación "
    "como uno de los Pokémon iniciales de Kanto. Es un pequeño reptil cuadrúpedo de piel "
    "verde azulada y manchas más oscuras, definido por el gran bulbo vegetal plantado en "
    "su espalda. Ese bulbo mantiene una relación simbiótica con Bulbasaur: crece al "
    "absorber la luz del sol mediante la fotosíntesis mientras el Pokémon toma nutrientes. "
    "En combate y en estado salvaje, Bulbasaur usa el bulbo para guardar energía y lanzar "
    "ataques de tipo Planta, como látigos de vid extensibles y semillas que drenan "
    "nutrientes. De carácter dócil y leal, los entrenadores jóvenes lo eligen a menudo por "
    "su estabilidad y su capacidad de adaptación al principio del viaje. Vive en praderas "
    "templadas y bosques ocultos, y suele descansar al sol para reunir energía. Como "
    "primera entrada de la Pokédex Nacional, Bulbasaur representa el equilibrio entre la "
    "naturaleza y el crecimiento."
)

DEFAULT_END = 1025
DEFAULT_USAGE_CSV = Path("data") / "overview_token_usage.csv"
OVERVIEW_LANGUAGES = ("en", "es")
REGIONAL_ADJECTIVE = {
    "alola": "Alolan",
    "galar": "Galarian",
    "hisui": "Hisuian",
    "paldea": "Paldean",
}
REGIONAL_PLACE_ES = {
    "alola": "Alola",
    "galar": "Galar",
    "hisui": "Hisui",
    "paldea": "Paldea",
}
TYPE_ES = {
    "normal": "Normal",
    "fire": "Fuego",
    "water": "Agua",
    "electric": "Eléctrico",
    "grass": "Planta",
    "ice": "Hielo",
    "fighting": "Lucha",
    "poison": "Veneno",
    "ground": "Tierra",
    "flying": "Volador",
    "psychic": "Psíquico",
    "bug": "Bicho",
    "rock": "Roca",
    "ghost": "Fantasma",
    "dragon": "Dragón",
    "dark": "Siniestro",
    "steel": "Acero",
    "fairy": "Hada",
}

# USD per 1M tokens (standard paid tier). Output rate also covers thoughts/thinking.
# Source: Google Gemini API pricing for Flash-Lite family.
MODEL_PRICES_PER_M: dict[str, tuple[float, float]] = {
    "gemini-3.5-flash-lite": (0.30, 2.50),
    "gemini-3.6-flash-lite": (0.30, 2.50),
    "gemini-3.1-flash-lite": (0.25, 1.50),
    "gemini-3.6-flash": (1.50, 7.50),
    "gemini-3.5-flash": (1.50, 9.00),
}
DEFAULT_PRICE_PER_M = (0.30, 2.50)

USAGE_FIELDS = (
    "pokedex_number",
    "name",
    "model",
    "prompt_tokens",
    "candidates_tokens",
    "thoughts_tokens",
    "total_tokens",
    "words",
    "cost_usd",
    "language",
)


def _estimate_cost_usd(model: str, usage: GeminiUsage) -> float:
    input_per_m, output_per_m = MODEL_PRICES_PER_M.get(model, DEFAULT_PRICE_PER_M)
    input_cost = (usage.prompt_tokens / 1_000_000) * input_per_m
    # Thinking tokens are billed at the output rate on Flash-Lite.
    output_tokens = usage.candidates_tokens + usage.thoughts_tokens
    output_cost = (output_tokens / 1_000_000) * output_per_m
    return input_cost + output_cost


def _english_name(species: dict, fallback: str) -> str:
    return _species_name(species, "en", fallback)


def _species_name(species: dict, language: str, fallback: str) -> str:
    for entry in species.get("names") or []:
        if (entry.get("language") or {}).get("name") == language and entry.get("name"):
            return str(entry["name"])
    if language != "en":
        return _species_name(species, "en", fallback)
    return fallback.replace("-", " ").title()


def _types_label(pokemon: dict | None, language: str = "en") -> str:
    if not pokemon:
        return "unknown" if language == "en" else "desconocido"
    slots = sorted(pokemon.get("types") or [], key=lambda item: item.get("slot", 0))
    names: list[str] = []
    for slot in slots:
        slug = ((slot.get("type") or {}).get("name") or "").strip()
        if not slug:
            continue
        if language == "es":
            names.append(TYPE_ES.get(slug, slug.replace("-", " ").title()))
        else:
            names.append(slug.replace("-", " ").title())
    if names:
        return "/".join(names)
    return "unknown" if language == "en" else "desconocido"


def _generation_label(species: dict) -> str:
    slug = ((species.get("generation") or {}).get("name") or "").strip()
    if not slug:
        return "unknown"
    # generation-i → Generation I
    suffix = slug.removeprefix("generation-").upper()
    return f"Generation {suffix}"


def _clean_overview(text: str) -> str:
    cleaned = text.strip()
    cleaned = re.sub(r"^```(?:\w+)?\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    cleaned = cleaned.strip().strip('"').strip("'").strip()
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned


def _id_from_url(url: str) -> int:
    try:
        return int(url.rstrip("/").split("/")[-1])
    except (TypeError, ValueError):
        return 0


def _form_presentation(species_name: str, form: str, language: str = "en") -> tuple[str, str] | None:
    """Display name and prompt kind for a non-base form. None keeps the species overview."""
    spanish = language == "es"
    if form == "gigantamax":
        if spanish:
            return f"{species_name} Gigamax", "forma Gigamax"
        return f"Gigantamax {species_name}", "Gigantamax form"
    if form == "mega" or form.startswith("mega-"):
        letter = "" if form == "mega" else form.removeprefix("mega-").upper()
        if spanish:
            name = f"Mega-{species_name}" if not letter else f"Mega-{species_name} {letter}"
            return name, "megaevolución"
        name = f"Mega {species_name}" if not letter else f"Mega {species_name} {letter}"
        return name, "Mega Evolution"
    if form.startswith("regional-"):
        region = form.removeprefix("regional-")
        if spanish:
            place = REGIONAL_PLACE_ES.get(region, region.title())
            return f"{species_name} de {place}", "forma regional"
        adjective = REGIONAL_ADJECTIVE.get(region, region.title())
        return f"{adjective} {species_name}", "regional form"
    if form.startswith("variant-"):
        label = variant_display_name(species_name, form)
        return label, "variante" if spanish else "variant"
    return None


def _build_prompt(
    *,
    pokemon_id: int,
    name: str,
    types: str,
    generation: str,
    language: str = "en",
    form_of: str | None = None,
    form_kind: str | None = None,
) -> str:
    if language == "es":
        return _build_prompt_es(
            pokemon_id=pokemon_id,
            name=name,
            types=types,
            generation=generation,
            form_of=form_of,
            form_kind=form_kind,
        )
    if form_of and form_kind:
        subject = (
            f"Write ONE single paragraph overview for {name}, a {form_kind} of {form_of}.\n"
            f"Types: {types}\n"
            f"The base species was introduced in {generation}. Write about {name} itself, "
            f"including how its appearance, typing, and battle role differ from {form_of}."
        )
    else:
        subject = (
            f"Write ONE single paragraph overview for National Dex #{pokemon_id} {name}.\n"
            f"Types: {types}\n"
            f"Introduced: {generation}"
        )
    return f"""You write Pokédex-style lore overviews for a Pokémon encyclopedia app.

{subject}

Follow this example closely in tone, structure, and length (~150 words, one paragraph):

EXAMPLE for Bulbasaur:
{EXAMPLE_OVERVIEW}

HARD RULES:
- Return ONLY the overview paragraph for {name}. No title, no CSV, no quotes around the whole paragraph, no markdown.
- Exactly one paragraph (no line breaks).
- Aim for about 150 words (roughly 130–170).
- Cover: typing/introduction, appearance, signature trait or biology, how it acts in battle or the wild, personality/habitat, and a closing note on its place in the Pokédex or lore.
- Use established Pokémon canon only. Do not invent competitive items, EV spreads, or fan theories.
- Do not mention Smogon, AI, or that you are a language model.
"""


def _build_prompt_es(
    *,
    pokemon_id: int,
    name: str,
    types: str,
    generation: str,
    form_of: str | None = None,
    form_kind: str | None = None,
) -> str:
    if form_of and form_kind:
        subject = (
            f"Escribe UN solo párrafo de resumen para {name}, una {form_kind} de {form_of}.\n"
            f"Tipos: {types}\n"
            f"La especie base se introdujo en {generation}. Escribe sobre {name}, "
            f"incluyendo en qué se diferencian su aspecto, su tipo y su papel en combate de {form_of}."
        )
    else:
        subject = (
            f"Escribe UN solo párrafo de resumen para el n.º {pokemon_id} de la Pokédex Nacional, {name}.\n"
            f"Tipos: {types}\n"
            f"Introducido: {generation}"
        )
    return f"""Escribes resúmenes al estilo de la Pokédex para una enciclopedia de Pokémon.

{subject}

Sigue de cerca el tono, la estructura y la extensión de este ejemplo (~150 palabras, un párrafo):

EJEMPLO para Bulbasaur:
{EXAMPLE_OVERVIEW_ES}

REGLAS:
- Responde SOLO con el párrafo de {name}, en español. Sin título, sin CSV, sin comillas que envuelvan el párrafo y sin markdown.
- Exactamente un párrafo (sin saltos de línea).
- Apunta a unas 150 palabras (entre 130 y 170).
- Cubre: tipo e introducción, aspecto, rasgo o biología característica, cómo actúa en combate o en estado salvaje, personalidad y hábitat, y una nota final sobre su lugar en la Pokédex o en la historia.
- Usa solo el canon establecido. No inventes objetos competitivos, repartos de EV ni teorías de fans.
- Usa los nombres oficiales en español de tipos, regiones y juegos. El nombre de la especie es el de los juegos en español.
- No menciones Smogon, la IA ni que eres un modelo de lenguaje.
"""


def _open_usage_csv(path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    handle = path.open("w", newline="", encoding="utf-8")
    writer = csv.DictWriter(handle, fieldnames=USAGE_FIELDS)
    writer.writeheader()
    handle.flush()
    return handle, writer


def _write_usage_row(
    writer: csv.DictWriter,
    handle,
    *,
    pokemon_id: int,
    name: str,
    model: str,
    usage: GeminiUsage,
    words: int,
    cost_usd: float,
    language: str,
) -> None:
    writer.writerow(
        {
            "pokedex_number": pokemon_id,
            "name": name,
            "model": model,
            "prompt_tokens": usage.prompt_tokens,
            "candidates_tokens": usage.candidates_tokens,
            "thoughts_tokens": usage.thoughts_tokens,
            "total_tokens": usage.total_tokens,
            "words": words,
            "cost_usd": f"{cost_usd:.8f}",
            "language": language,
        }
    )
    handle.flush()


async def generate_one(
    *,
    pokemon_id: int,
    force: bool,
    dry_run: bool,
    language: str,
    repo: PokemonOverviewRepository,
    pokemon_repo: PokemonRepository,
) -> tuple[str, GeminiUsage | None, str, str, int]:
    """Return (status, usage, name, model, words). usage is set when Gemini was called."""
    existing = pokemon_repo.get_by_resource_id(pokemon_id)
    if language == "es" and (existing is None or not repo.exists_for(existing.id)):
        return "need-en", None, "", "", 0
    if not force and existing is not None and repo.has_language(existing.id, language):
        return "skip", None, "", "", 0

    pokeapi = get_pokeapi_client()
    gemini = get_gemini_client()
    pokemon = await pokeapi.get_pokemon(pokemon_id)
    if not pokemon:
        return "missing", None, "", "", 0
    species_url = (pokemon.get("species") or {}).get("url") or ""
    species_id = _id_from_url(species_url) or pokemon_id
    species = await pokeapi.get_species(species_id)
    if not species:
        return "missing", None, "", "", 0
    species_name = _species_name(species, language, str(species.get("name") or f"#{species_id}"))
    stored_name = _english_name(species, str(species.get("name") or f"#{species_id}"))
    species_slug = str(species.get("name") or "")
    pokemon_slug = str(pokemon.get("name") or "")
    stored_form = form_key(pokemon_slug, species_slug, is_default=bool(pokemon.get("is_default"))) or "base"
    presented = _form_presentation(species_name, stored_form, language)
    name = presented[0] if presented else species_name
    generation = _generation_label(species)
    if language == "es":
        generation = generation.replace("Generation ", "Generación ")
    prompt = _build_prompt(
        pokemon_id=species_id if presented else pokemon_id,
        name=name,
        types=_types_label(pokemon, language),
        generation=generation,
        language=language,
        form_of=species_name if presented else None,
        form_kind=presented[1] if presented else None,
    )
    result = await gemini.generate_text(prompt)
    overview = _clean_overview(result.text)
    words = len(overview.split()) if overview else 0
    if not overview:
        return "empty", result.usage, name, result.model, 0
    if dry_run:
        cost = _estimate_cost_usd(result.model, result.usage)
        print(
            f"  dry-run {pokemon_id} {name} ({words} words; "
            f"in={result.usage.prompt_tokens} out={result.usage.candidates_tokens} "
            f"total={result.usage.total_tokens} cost=${cost:.6f}): {overview[:120]}…"
        )
        return "dry-run", result.usage, name, result.model, words
    record_name = name
    if language == "es":
        english_form = _form_presentation(stored_name, stored_form, "en")
        record_name = english_form[0] if english_form else stored_name
    row = pokemon_repo.upsert(
        pokedex_id=species_id,
        form=stored_form,
        name=record_name,
        resource_id=pokemon_id,
        stats=_stats_from_payload(pokemon),
        types=types_from_payload(pokemon),
    )
    repo.upsert(
        pokemon=row.id,
        name=record_name,
        overview=overview,
        source="gemini",
        model=gemini.provider_label,
        language=language,
    )
    cost = _estimate_cost_usd(result.model, result.usage)
    print(
        f"  saved {pokemon_id} {name} ({words} words; "
        f"in={result.usage.prompt_tokens} out={result.usage.candidates_tokens} "
        f"thoughts={result.usage.thoughts_tokens} total={result.usage.total_tokens} "
        f"cost=${cost:.6f})"
    )
    return "saved", result.usage, name, result.model, words


def _is_selected_form(form: str | None, *, variants: bool) -> bool:
    if not form or form == "base":
        return False
    if variants:
        return form.startswith("variant-")
    return form == "mega" or form.startswith("mega-") or form.startswith("regional-")


async def form_pokemon_ids(*, variants: bool) -> list[int]:
    """PokéAPI ids for mega/regional forms, or for own-id variants such as Eternal Floette."""
    pokeapi = get_pokeapi_client()
    ids: list[int] = []
    for species_id in range(1, DEFAULT_END + 1):
        species = await pokeapi.get_species(species_id)
        if not species:
            continue
        species_slug = str(species.get("name") or "")
        for variety in species.get("varieties") or []:
            if variety.get("is_default"):
                continue
            pokemon = variety.get("pokemon") or {}
            slug = str(pokemon.get("name") or "")
            form = form_key(slug, species_slug, is_default=bool(variety.get("is_default")))
            if not _is_selected_form(form, variants=variants):
                continue
            pokemon_id = _id_from_url(str(pokemon.get("url") or ""))
            if pokemon_id > 0:
                ids.append(pokemon_id)
    return ids


async def run(
    *,
    start: int,
    end: int,
    force: bool,
    dry_run: bool,
    delay_seconds: float,
    usage_csv: Path,
    forms: bool,
    variants: bool,
    language: str,
) -> None:
    if not settings.gemini_api_key.strip():
        raise RuntimeError("GEMINI_API_KEY is not set in backend/.env")

    repo = PokemonOverviewRepository()
    pokemon_repo = PokemonRepository()
    if forms or variants:
        ids = await form_pokemon_ids(variants=variants)
        label = "variants" if variants else "mega evolutions and regional forms"
        print(f"Generating {language} overviews for {len(ids)} {label}…")
    else:
        ids = list(range(start, end + 1))
        print(f"Generating {language} overviews for #{start}–#{end} ({len(ids)} species)…")
    print(f"Token usage CSV: {usage_csv.resolve()}")
    if not force:
        existing = repo.existing_resource_ids(ids, language)
        print(f"Already in DB: {len(existing)} (use --force to regenerate)")
    counts = {"saved": 0, "skip": 0, "missing": 0, "need-en": 0, "empty": 0, "dry-run": 0, "error": 0}
    token_totals = GeminiUsage()
    cost_total = 0.0
    retry_wait_seconds = 60.0
    csv_handle, csv_writer = _open_usage_csv(usage_csv)
    try:
        for index, pokemon_id in enumerate(ids, start=1):
            print(f"[{index}/{len(ids)}] #{pokemon_id}")
            status = "error"
            while True:
                try:
                    status, usage, name, model, words = await generate_one(
                        pokemon_id=pokemon_id,
                        force=force,
                        dry_run=dry_run,
                        language=language,
                        repo=repo,
                        pokemon_repo=pokemon_repo,
                    )
                except Exception as exc:  # noqa: BLE001 — retry same species
                    counts["error"] += 1
                    print(f"  error: {exc}")
                    print(f"  waiting {retry_wait_seconds:g}s then retrying #{pokemon_id}…")
                    await asyncio.sleep(retry_wait_seconds)
                    continue

                if usage is not None:
                    cost = _estimate_cost_usd(model, usage)
                    cost_total += cost
                    token_totals = GeminiUsage(
                        prompt_tokens=token_totals.prompt_tokens + usage.prompt_tokens,
                        candidates_tokens=token_totals.candidates_tokens + usage.candidates_tokens,
                        thoughts_tokens=token_totals.thoughts_tokens + usage.thoughts_tokens,
                        total_tokens=token_totals.total_tokens + usage.total_tokens,
                    )
                    _write_usage_row(
                        csv_writer,
                        csv_handle,
                        pokemon_id=pokemon_id,
                        name=name or f"#{pokemon_id}",
                        model=model,
                        usage=usage,
                        words=words,
                        cost_usd=cost,
                        language=language,
                    )

                if status == "empty":
                    counts["empty"] += 1
                    print("  fail (empty overview)")
                    print(f"  waiting {retry_wait_seconds:g}s then retrying #{pokemon_id}…")
                    await asyncio.sleep(retry_wait_seconds)
                    continue

                counts[status] = counts.get(status, 0) + 1
                if status == "skip":
                    print("  skip (exists)")
                elif status == "missing":
                    print("  skip (species not found)")
                elif status == "need-en":
                    print("  skip (English overview required)")
                break

            if delay_seconds > 0 and index < len(ids) and status in {"saved", "dry-run"}:
                print(f"  waiting {delay_seconds:g}s…")
                await asyncio.sleep(delay_seconds)
    finally:
        csv_handle.close()

    print(
        "Done.",
        f"saved={counts['saved']}",
        f"skip={counts['skip']}",
        f"missing={counts['missing']}",
        f"need_en={counts['need-en']}",
        f"empty={counts['empty']}",
        f"dry_run={counts['dry-run']}",
        f"error={counts['error']}",
        f"collection_size={repo.count()}",
    )
    print(
        "Token totals:",
        f"prompt={token_totals.prompt_tokens}",
        f"candidates={token_totals.candidates_tokens}",
        f"thoughts={token_totals.thoughts_tokens}",
        f"total={token_totals.total_tokens}",
        f"cost=${cost_total:.6f}",
        f"(csv={usage_csv})",
    )


async def _run(**kwargs) -> None:
    try:
        await run(**kwargs)
    finally:
        await shutdown_external_clients()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate Pokémon lore overviews with Gemini and save to MongoDB"
    )
    parser.add_argument("--id", type=int, default=None, help="Generate a single National Dex id")
    parser.add_argument(
        "--forms",
        action="store_true",
        help="Generate mega evolutions and regional forms instead of National Dex species",
    )
    parser.add_argument(
        "--variants",
        action="store_true",
        help="Generate own-id variants such as Eternal Floette and Heat Rotom",
    )
    parser.add_argument("--start", type=int, default=1, help="First National Dex id (inclusive)")
    parser.add_argument(
        "--end",
        type=int,
        default=DEFAULT_END,
        help=f"Last National Dex id (inclusive), default {DEFAULT_END}",
    )
    parser.add_argument(
        "--lang",
        choices=OVERVIEW_LANGUAGES,
        default="en",
        help="Overview language to generate (default en). Spanish requires an existing English overview.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Regenerate even when an overview already exists",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Call Gemini but do not write to MongoDB",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=0.0,
        help="Optional pause after each generated overview (default 0; paid tier needs none)",
    )
    parser.add_argument(
        "--usage-csv",
        type=Path,
        default=DEFAULT_USAGE_CSV,
        help=f"CSV path for per-request token counts (default {DEFAULT_USAGE_CSV})",
    )
    args = parser.parse_args()
    if args.forms and args.variants:
        parser.error("use either --forms or --variants, not both")

    if args.id is not None:
        start = end = args.id
    else:
        start = max(1, args.start)
        end = max(start, args.end)

    connect_mongo()
    try:
        asyncio.run(
            _run(
                start=start,
                end=end,
                force=args.force,
                dry_run=args.dry_run,
                delay_seconds=max(0.0, args.delay),
                usage_csv=args.usage_csv,
                forms=args.forms,
                variants=args.variants,
                language=args.lang,
            )
        )
    finally:
        disconnect_mongo()


if __name__ == "__main__":
    main()
