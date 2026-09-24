import { useEffect, useState } from "react";
import { spriteUrl } from "../format";
import { PokemonSprite } from "./PokemonSprite";

const femaleSpriteCache = new Map<string, boolean>();

export function useFemaleSprite(pokemonId: number, shiny: boolean): boolean {
  const key = `${pokemonId}:${shiny ? "s" : "n"}`;
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
    image.src = spriteUrl(pokemonId, shiny, true);
    return () => {
      cancelled = true;
    };
  }, [key, pokemonId, shiny]);

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
};

/** Male and female art together when both are owned and the female sprite exists. */
export function GenderSprites({ pokemonId, shiny = false, male, female, alt, className, loading }: GenderSpritesProps) {
  const femaleArt = useFemaleSprite(pokemonId, shiny);
  const showPair = male && female && femaleArt;
  if (!showPair) {
    return (
      <PokemonSprite
        pokemonId={pokemonId}
        shiny={shiny}
        female={female && !male && femaleArt}
        alt={alt}
        loading={loading}
        className={className}
      />
    );
  }
  const frameClass = ["pk-sprite-frame", "pk-gender-sprites", className].filter(Boolean).join(" ");
  return (
    <span className={frameClass}>
      <img className="pk-gender-male" src={spriteUrl(pokemonId, shiny)} alt={alt} loading={loading} draggable={false} />
      <img
        className="pk-gender-female"
        src={spriteUrl(pokemonId, shiny, true)}
        alt={`${alt} female`}
        loading={loading}
        draggable={false}
      />
    </span>
  );
}
