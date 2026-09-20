import { CHART, TYPES } from "./catalog";

export type MatchupGroup = {
  label: string;
  types: string[];
};

type GroupLabels = {
  quad: string;
  double: string;
  resist: string;
  immune: string;
};

function chartValue(attacker: string, defender: string) {
  const ratio = CHART[attacker]?.[defender];
  return ratio === undefined ? 1 : ratio;
}

function groupByMultiplier(eff: Record<string, number>, labels: GroupLabels): MatchupGroup[] {
  return [
    { label: labels.quad, types: TYPES.filter((type) => eff[type] >= 4) },
    { label: labels.double, types: TYPES.filter((type) => eff[type] === 2) },
    { label: labels.resist, types: TYPES.filter((type) => eff[type] > 0 && eff[type] < 1) },
    { label: labels.immune, types: TYPES.filter((type) => eff[type] === 0) },
  ];
}

export function defensiveGroups(defenderTypes: string[]) {
  const eff: Record<string, number> = {};
  TYPES.forEach((atk) => {
    let multiplier = 1;
    defenderTypes.forEach((def) => {
      multiplier *= chartValue(atk, def);
    });
    eff[atk] = multiplier;
  });
  return groupByMultiplier(eff, {
    quad: "Very weak ×4",
    double: "Weak ×2",
    resist: "Resists",
    immune: "Immune",
  });
}

export function offensiveGroups(attackerTypes: string[]) {
  const eff: Record<string, number> = {};
  TYPES.forEach((def) => {
    let best = 0;
    attackerTypes.forEach((atk) => {
      const value = chartValue(atk, def);
      if (value > best) {
        best = value;
      }
    });
    eff[def] = best;
  });
  return groupByMultiplier(eff, {
    quad: "Super effective ×4",
    double: "Super effective ×2",
    resist: "Not very effective",
    immune: "No effect",
  });
}
