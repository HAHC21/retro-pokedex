import { Fragment, useLayoutEffect } from "react";
import { Link } from "react-router-dom";
import { legalDocument, type LegalPageId } from "../legal";
import { useI18n } from "../i18n/context";

const INLINE_LINK = /\[([^\]]+)\]\(([^)]+)\)/g;

function RichParagraph({ text }: { text: string }) {
  const parts: Array<string | { label: string; href: string }> = [];
  let last = 0;
  for (const match of text.matchAll(INLINE_LINK)) {
    const index = match.index ?? 0;
    if (index > last) {
      parts.push(text.slice(last, index));
    }
    parts.push({ label: match[1], href: match[2] });
    last = index + match[0].length;
  }
  if (last < text.length) {
    parts.push(text.slice(last));
  }

  return (
    <p className="pk-changelog-intro">
      {parts.map((part, index) => {
        if (typeof part === "string") {
          return <Fragment key={index}>{part}</Fragment>;
        }
        if (part.href.startsWith("/")) {
          return (
            <Link key={index} to={part.href}>
              {part.label}
            </Link>
          );
        }
        const external = part.href.startsWith("http");
        return (
          <a
            key={index}
            href={part.href}
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            {part.label}
          </a>
        );
      })}
    </p>
  );
}

export function LegalView({ page }: { page: LegalPageId }) {
  const { locale } = useI18n();
  const doc = legalDocument(page, locale);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    const frame = requestAnimationFrame(() => window.scrollTo(0, 0));
    return () => cancelAnimationFrame(frame);
  }, [page]);

  return (
    <article className="pk-page pk-legal">
      <header className="pk-changelog-head">
        <p className="pk-changelog-kicker">{doc.kicker}</p>
        <h1>{doc.title}</h1>
        <p className="pk-changelog-meta">
          {doc.updatedLabel}
          <span aria-hidden="true"> · </span>
          <time dateTime="2026-10-01">{doc.updated}</time>
        </p>
        <p>{doc.lead}</p>
      </header>
      {doc.sections.map((section) => (
        <section key={section.id} className="pk-changelog-release" id={section.id}>
          <h2>{section.title}</h2>
          {section.paragraphs.map((paragraph) => (
            <RichParagraph key={paragraph} text={paragraph} />
          ))}
        </section>
      ))}
    </article>
  );
}
