import { Blueprint } from "./Blueprint";
import { TypeTag } from "./TypeTag";
import type { MatchupGroup } from "../matchups";

type MatchupPanelProps = {
  title: string;
  groups: MatchupGroup[];
};

export function MatchupPanel({ title, groups }: MatchupPanelProps) {
  return (
    <Blueprint className="pk-matchups">
      <h3>{title}</h3>
      <div className="pk-matchup-grid">
        {groups.map((group) => (
          <div key={group.label}>
            <span className="pk-kicker">{group.label}</span>
            <span className="pk-types">
              {group.types.map((type) => (
                <TypeTag key={type} type={type} />
              ))}
            </span>
            <span className="pk-none">{group.types.length ? "" : "None"}</span>
          </div>
        ))}
      </div>
    </Blueprint>
  );
}
