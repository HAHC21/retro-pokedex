import type { CSSProperties, ElementType, ReactNode } from "react";

type BlueprintProps = {
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  onClick?: () => void;
};

export function Blueprint({ as: Tag = "div", className, style, children, onClick }: BlueprintProps) {
  return (
    <Tag className={["blueprint", "pk-cell", className].filter(Boolean).join(" ")} style={style} onClick={onClick}>
      <i className="corner tl" aria-hidden="true" />
      <i className="corner tr" aria-hidden="true" />
      <i className="corner bl" aria-hidden="true" />
      <i className="corner br" aria-hidden="true" />
      {children}
    </Tag>
  );
}
