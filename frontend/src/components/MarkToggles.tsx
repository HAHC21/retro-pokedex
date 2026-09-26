import type { CSSProperties } from "react";
import { pillStyle } from "../format";
import { getMessages } from "../i18n/runtime";
import type { GenderChoice } from "../progress";
import type { MarkKey } from "../types";

type MarkTogglesProps = {
  caught: boolean;
  shiny: boolean;
  caughtMale?: boolean;
  caughtFemale?: boolean;
  shinyMale?: boolean;
  shinyFemale?: boolean;
  available: boolean | undefined;
  unavailableLabel: string;
  onCaught: () => void;
  onShiny: () => void;
  onGender?: (key: MarkKey, gender: GenderChoice) => void;
};

export function MarkToggles({
  caught,
  shiny,
  caughtMale,
  caughtFemale,
  shinyMale,
  shinyFemale,
  available,
  unavailableLabel,
  onCaught,
  onShiny,
  onGender,
}: MarkTogglesProps) {
  const marks = getMessages().marks;
  if (available === true) {
    return (
      <span className="pk-toggles">
        <MarkColumn
          label={marks.normal}
          maleLabel={marks.male}
          femaleLabel={marks.female}
          maleAria={marks.normalMale}
          femaleAria={marks.normalFemale}
          active={caught}
          shiny={false}
          male={!!caughtMale}
          female={!!caughtFemale}
          onClick={onCaught}
          onGender={onGender ? (gender) => onGender("caught", gender) : undefined}
        />
        <MarkColumn
          label={marks.shiny}
          maleLabel={marks.male}
          femaleLabel={marks.female}
          maleAria={marks.shinyMale}
          femaleAria={marks.shinyFemale}
          active={shiny}
          shiny
          male={!!shinyMale}
          female={!!shinyFemale}
          onClick={onShiny}
          onGender={onGender ? (gender) => onGender("shiny", gender) : undefined}
        />
      </span>
    );
  }
  if (available === false) {
    return <span className="pk-unavailable">{unavailableLabel}</span>;
  }
  return <span className="pk-unavailable">{getMessages().marks.checking}</span>;
}

function genderStyle(selected: boolean, borderColor: string): CSSProperties {
  const idle = pillStyle(false, false);
  if (!selected) {
    return { ...idle, width: "100%" };
  }
  return {
    ...idle,
    width: "100%",
    background: "transparent",
    color: "var(--color-neutral-700)",
    border: `2px solid ${borderColor}`,
  };
}

function MarkColumn({
  label,
  maleLabel,
  femaleLabel,
  maleAria,
  femaleAria,
  active,
  shiny,
  male,
  female,
  onClick,
  onGender,
}: {
  label: string;
  maleLabel: string;
  femaleLabel: string;
  maleAria: string;
  femaleAria: string;
  active: boolean;
  shiny: boolean;
  male: boolean;
  female: boolean;
  onClick: () => void;
  onGender?: (gender: GenderChoice) => void;
}) {
  return (
    <span className="pk-mark-col">
      <button type="button" className="pk-toggle" style={pillStyle(active, shiny)} onClick={onClick}>
        {label}
      </button>
      {onGender ? (
        <span className={active ? "pk-gender-slot is-open" : "pk-gender-slot"}>
          <span className="pk-gender-slot-inner">
            <span className="pk-gender-choices">
              <button
                type="button"
                className="pk-toggle"
                style={genderStyle(male, "var(--color-accent)")}
                aria-pressed={male}
                aria-label={maleAria}
                onClick={() => onGender("male")}
              >
                {maleLabel}
              </button>
              <button
                type="button"
                className="pk-toggle"
                style={genderStyle(female, "#e45b9a")}
                aria-pressed={female}
                aria-label={femaleAria}
                onClick={() => onGender("female")}
              >
                {femaleLabel}
              </button>
            </span>
          </span>
        </span>
      ) : null}
    </span>
  );
}
