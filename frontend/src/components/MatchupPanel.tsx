import { Fold } from "./Fold";
import { TypeTag } from "./TypeTag";
import { getMessages } from "../i18n/runtime";
import type { MatchupGroup } from "../matchups";

type MatchupPanelProps = {
  title: string;
  groups: MatchupGroup[];
};

export function MatchupPanel({ title, groups }: MatchupPanelProps) {
  return (
    <Fold title={title} className="pk-matchups">
      <div className="pk-matchup-grid">
        {groups.map((group) => (
          <div key={group.label}>
            <span className="pk-kicker">{group.label}</span>
            <span className="pk-types">
              {group.types.map((type) => (
                <TypeTag key={type} type={type} />
              ))}
            </span>
            <span className="pk-none">{group.types.length ? "" : getMessages().matchups.none}</span>
          </div>
        ))}
      </div>
    </Fold>
  );
}
