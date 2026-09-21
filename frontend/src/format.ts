import type { CSSProperties } from "react";
import { SPRITE_BASE } from "./catalog";

export function title(value: string) {
  if (!value) {
    return "";
  }
  return value
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

const REGION_PREFIX = /^(kanto|johto|hoenn|sinnoh|unova|kalos|alola|galar|paldea|hisui|kitakami|blueberry)-/;

/** PokéAPI area slugs → display names (Route 22, Friend Safari (Ice)). */
export function placeLabel(areaName: string) {
  let name = (areaName || "").replace(/-area$/i, "");
  name = name.replace(REGION_PREFIX, "");
  const safari = name.match(/^friend-safari(?:-(.+))?$/i);
  if (safari) {
    return safari[1] ? `Friend Safari (${title(safari[1])})` : "Friend Safari";
  }
  const route = name.match(/^route-(\d+[a-z]?)$/i);
  if (route) {
    return `Route ${route[1]}`;
  }
  return title(name) || "Unknown";
}

export function idFromUrl(url: string) {
  return parseInt(url.replace(/\/$/, "").split("/").pop() || "0", 10);
}

export function dexNum(id: number) {
  return `#${String(id).padStart(4, "0")}`;
}

export function spriteUrl(id: number, shiny = false) {
  return `${SPRITE_BASE}${shiny ? "/shiny/" : "/"}${id}.png`;
}

export function whenText(stamp?: number | null) {
  if (!stamp) {
    return "Date not recorded";
  }
  const days = Math.floor((Date.now() - stamp) / 86400000);
  if (days <= 0) {
    return "Today";
  }
  if (days === 1) {
    return "Yesterday";
  }
  if (days < 30) {
    return `${days} days ago`;
  }
  return new Date(stamp).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export type EvolutionDetail = {
  min_level?: number;
  item?: { name: string };
  held_item?: { name: string };
  min_happiness?: number;
  time_of_day?: string;
  location?: { name: string };
  known_move?: { name: string };
  trigger?: { name: string };
};

export function condText(detail?: EvolutionDetail) {
  if (!detail) {
    return "—";
  }
  const parts: string[] = [];
  if (detail.min_level) {
    parts.push(`Level ${detail.min_level}`);
  }
  if (detail.item) {
    parts.push(title(detail.item.name));
  }
  if (detail.held_item) {
    parts.push(`Holding ${title(detail.held_item.name)}`);
  }
  if (detail.min_happiness) {
    parts.push(`Friendship ${detail.min_happiness}`);
  }
  if (detail.time_of_day) {
    parts.push(detail.time_of_day === "day" ? "Daytime" : "Night");
  }
  if (detail.location) {
    parts.push(title(detail.location.name));
  }
  if (detail.known_move) {
    parts.push(`Knows ${title(detail.known_move.name)}`);
  }
  if (detail.trigger?.name === "trade") {
    parts.push("Trade");
  }
  if (!parts.length && detail.trigger) {
    parts.push(title(detail.trigger.name));
  }
  return parts.join(" · ");
}

export function navBtnStyle(active: boolean): CSSProperties {
  return active
    ? {
        background: "var(--color-accent)",
        color: "#fff",
        border: "1px solid var(--color-accent-700)",
      }
    : {
        background: "transparent",
        color: "var(--color-accent-800)",
        border: "1px solid var(--color-divider)",
      };
}

export function pillStyle(active: boolean, strong: boolean, extra?: CSSProperties): CSSProperties {
  const base: CSSProperties = {
    fontFamily: "var(--font-heading)",
    fontWeight: 600,
    fontSize: 12,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    padding: "5px 6px",
    cursor: "pointer",
    borderRadius: 0,
  };
  if (active && strong) {
    return { ...base, background: "var(--color-accent-900)", color: "#fff", border: "1px solid var(--color-accent-900)", ...extra };
  }
  if (active) {
    return { ...base, background: "var(--color-accent)", color: "#fff", border: "1px solid var(--color-accent-700)", ...extra };
  }
  return { ...base, background: "transparent", color: "var(--color-neutral-700)", border: "1px solid var(--color-divider)", ...extra };
}

export function kindStyle(kind: "Normal" | "Shiny"): CSSProperties {
  return kind === "Shiny"
    ? {
        fontSize: 10,
        letterSpacing: "0.12em",
        background: "var(--color-accent-900)",
        color: "#fff",
        border: "1px solid var(--color-accent-900)",
      }
    : {
        fontSize: 10,
        letterSpacing: "0.12em",
        background: "var(--color-accent-100)",
        color: "var(--color-accent-800)",
        border: "1px solid var(--color-accent-600)",
      };
}
