import { useEffect, useState } from "react";
import { spriteUrl } from "../format";
import { PokemonSprite, useResolvedSprite } from "./PokemonSprite";

const femaleSpriteCache = new Map<string, boolean>();

export function useFemaleSprite(pokemonId: number, shiny: boolean, formName?: string | null): boolean {
  const key = `${pokemonId}:${shiny ? "s" : "n"}:${formName || ""}`;
  const [exists, setExists] = useState(() => femaleSpriteCache.get(key) ?? false);

  useEffect(() => {
    const cached = femaleSpriteCache.get(key);
    if (cached !== undefined) {
      setExists(cached);
      return;
    }
    let cancelled = false;
    const image = new Image();
    image.onload = () => {
      femaleSpriteCache.set(key, image.naturalWidth > 0);
      if (!cancelled) {
        setExists(image.naturalWidth > 0);
      }
    };
    image.onerror = () => {
      femaleSpriteCache.set(key, false);
      if (!cancelled) {
        setExists(false);
      }
    };
    image.src = spriteUrl(pokemonId, shiny, true, formName);
    return () => {
      cancelled = true;
    };
  }, [key, pokemonId, shiny, formName]);

  return exists;
}

type GenderSpritesProps = {
  pokemonId: number;
  shiny?: boolean;
  male: boolean;
  female: boolean;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
  formName?: string | null;
  fallbackId?: number | null;
};

/** Male and female art together when both are owned and the female sprite exists. */
export function GenderSprites({
  pokemonId,
  shiny = false,
  male,
  female,
  alt,
  className,
  loading,
  formName = null,
  fallbackId = null,
}: GenderSpritesProps) {
  const femaleArt = useFemaleSprite(pokemonId, shiny, formName);
  const showPair = male && female && femaleArt;
  if (!showPair) {
    return (
      <PokemonSprite
        pokemonId={pokemonId}
        shiny={shiny}
        female={female && !male && femaleArt}
        formName={formName}
        fallbackId={fallbackId}
        alt={alt}
        loading={loading}
        className={className}
      />
    );
  }
  return (
    <GenderPair
      pokemonId={pokemonId}
      shiny={shiny}
      formName={formName}
      fallbackId={fallbackId}
      alt={alt}
      className={className}
      loading={loading}
    />
  );
}

function GenderPair({
  pokemonId,
  shiny,
  formName,
  fallbackId,
  alt,
  className,
  loading,
}: {
  pokemonId: number;
  shiny: boolean;
  formName?: string | null;
  fallbackId?: number | null;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
}) {
  const maleSprite = useResolvedSprite(pokemonId, shiny, false, formName, fallbackId);
  const femaleSprite = useResolvedSprite(pokemonId, shiny, true, formName, fallbackId);
  const frameClass = ["pk-sprite-frame", "pk-gender-sprites", className].filter(Boolean).join(" ");
  return (
    <span className={frameClass}>
      <img className="pk-gender-male" src={maleSprite.src} alt={alt} loading={loading} onError={maleSprite.onError} draggable={false} />
      <img
        className="pk-gender-female"
        src={femaleSprite.src}
        alt={`${alt} female`}
        loading={loading}
        onError={femaleSprite.onError}
        draggable={false}
      />
    </span>
  );
}
