import type { CSSProperties } from "react";
import { SPRITE_BASE } from "./catalog";
import { fill, getLocale, getMessages } from "./i18n/runtime";

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
    const places = getMessages().places;
    return safari[1] ? fill(places.friendSafariTyped, { type: title(safari[1]) }) : places.friendSafari;
  }
  const route = name.match(/^route-(\d+[a-z]?)$/i);
  if (route) {
    return fill(getMessages().places.route, { number: route[1] });
  }
  return title(name) || getMessages().places.unknown;
}

export function idFromUrl(url: string) {
  return parseInt(url.replace(/\/$/, "").split("/").pop() || "0", 10);
}

export function dexNum(id: number) {
  return `#${String(id).padStart(4, "0")}`;
}

export function spriteUrl(id: number, shiny = false, female = false, formName?: string | null) {
  const folder = `${shiny ? "/shiny" : ""}/${female ? "female/" : ""}`;
  const file = formName ? `${id}-${formName}` : String(id);
  return `${SPRITE_BASE}${folder}${file}.png`;
}

export function whenText(stamp?: number | null) {
  const time = getMessages().time;
  if (!stamp) {
    return time.unrecorded;
  }
  const days = Math.floor((Date.now() - stamp) / 86400000);
  if (days <= 0) {
    return time.today;
  }
  if (days === 1) {
    return time.yesterday;
  }
  if (days < 30) {
    return fill(time.daysAgo, { count: days });
  }
  return new Date(stamp).toLocaleDateString(getLocale(), { day: "numeric", month: "short", year: "numeric" });
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
  const evo = getMessages().evo;
  const parts: string[] = [];
  if (detail.min_level) {
    parts.push(fill(evo.level, { level: detail.min_level }));
  }
  if (detail.item) {
    parts.push(title(detail.item.name));
  }
  if (detail.held_item) {
    parts.push(fill(evo.holding, { item: title(detail.held_item.name) }));
  }
  if (detail.min_happiness) {
    parts.push(fill(evo.friendship, { value: detail.min_happiness }));
  }
  if (detail.time_of_day) {
    parts.push(detail.time_of_day === "day" ? evo.day : evo.night);
  }
  if (detail.location) {
    parts.push(title(detail.location.name));
  }
  if (detail.known_move) {
    parts.push(fill(evo.knows, { move: title(detail.known_move.name) }));
  }
  if (detail.trigger?.name === "trade") {
    parts.push(evo.trade);
  }
  if (!parts.length && detail.trigger) {
    parts.push(title(detail.trigger.name));
  }
  return parts.join(" · ");
}

/** Evolution lines arrive as English phrases from the API. Show them in the active language. */
export function displayEvolutionCond(cond: string): string {
  if (!cond || cond === "—" || getLocale() === "en") {
    return cond;
  }
  const evo = getMessages().evo;
  if (cond === "Base") {
    return evo.base;
  }
  const holding = /^Trade while holding (.+)$/.exec(cond);
  if (holding) {
    return fill(evo.tradeHolding, { item: holding[1] });
  }
  if (cond === "Trade") {
    return evo.trade;
  }
  return cond
    .replace(/^Level (\d+)/, (_match: string, level: string) => fill(evo.level, { level }))
    .replace(/^Level up/, evo.levelUp)
    .split("with high friendship").join(evo.highFriendship)
    .split("with high affection").join(evo.highAffection)
    .split("during the day").join(evo.duringDay)
    .split("at night").join(evo.atNight)
    .replace(/while holding ([^,]+)/g, (_match: string, item: string) => fill(evo.holding, { item: item.trim() }))
    .replace(/while knowing a ([^,]+)-type move/g, (_match: string, type: string) => fill(evo.knowsType, { type: type.trim() }))
    .replace(/while knowing ([^,]+)/g, (_match: string, move: string) => fill(evo.knows, { move: move.trim() }))
    .split(" and ").join(evo.and);
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
