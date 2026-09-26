import { useEffect, useRef, useState, type ImgHTMLAttributes } from "react";
import { spriteUrl } from "../format";

type PokemonSpriteProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  pokemonId: number;
  shiny?: boolean;
  female?: boolean;
  formName?: string | null;
  fallbackId?: number | null;
};

export function useResolvedSprite(
  pokemonId: number,
  shiny: boolean,
  female: boolean,
  formName?: string | null,
  fallbackId?: number | null,
) {
  const primary = spriteUrl(pokemonId, shiny, female, formName);
  const fallbackTarget = formName ? (fallbackId ?? pokemonId) : fallbackId && fallbackId !== pokemonId ? fallbackId : null;
  const fallback = fallbackTarget != null ? spriteUrl(fallbackTarget, shiny, female) : null;
  const [src, setSrc] = useState(primary);
  const fellBack = useRef(false);

  useEffect(() => {
    fellBack.current = false;
    setSrc(primary);
  }, [primary]);

  const onError = () => {
    if (!fallback || fallback === src || fellBack.current) {
      return;
    }
    fellBack.current = true;
    setSrc(fallback);
  };

  return { src, onError };
}

/** Static sprite PNG (normal or shiny). Grayscale → color is handled by CSS on card hover. */
export function PokemonSprite({
  pokemonId,
  shiny = false,
  female = false,
  formName = null,
  fallbackId = null,
  className,
  alt,
  loading,
  ...rest
}: PokemonSpriteProps) {
  const frameClass = ["pk-sprite-frame", className].filter(Boolean).join(" ");
  const { src, onError } = useResolvedSprite(pokemonId, shiny, female, formName, fallbackId);

  return (
    <span className={frameClass}>
      <img
        {...rest}
        alt={alt ?? ""}
        loading={loading}
        className="pk-sprite-frame-img"
        src={src}
        onError={onError}
        width={96}
        height={96}
        draggable={false}
      />
    </span>
  );
}

type SpriteImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  pokemonId: number;
  shiny?: boolean;
  formName?: string | null;
  fallbackId?: number | null;
};

/** Plain img for form pickers. Missing art falls back to the base species sprite. */
export function SpriteImage({
  pokemonId,
  shiny = false,
  formName = null,
  fallbackId = null,
  alt,
  ...rest
}: SpriteImageProps) {
  const { src, onError } = useResolvedSprite(pokemonId, shiny, false, formName, fallbackId);
  return <img {...rest} alt={alt ?? ""} src={src} onError={onError} draggable={false} />;
}
