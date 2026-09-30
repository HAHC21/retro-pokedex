import { useState } from "react";
import { BoxScanner } from "../components/scanner/BoxScanner";
import { Blueprint } from "../components/Blueprint";
import { spriteUrl } from "../format";
import { useI18n } from "../i18n/context";
import { ViewLoading } from "../components/ViewLoading";
import type { DexIndex, Progress } from "../types";

const SHINX_ID = 403;

type ScanViewProps = {
  index: DexIndex;
  indexLoading: boolean;
  game: string;
  prog: Progress;
  signedIn: boolean;
  authReady: boolean;
  onSignIn: () => void;
  onLogIn: () => void;
  onCommit: (next: Progress) => Promise<void> | void;
};

export function ScanView({
  index,
  indexLoading,
  game,
  prog,
  signedIn,
  authReady,
  onSignIn,
  onLogIn,
  onCommit,
}: ScanViewProps) {
  const { messages: m } = useI18n();
  const copy = m.scanner;
  const [globalLimit, setGlobalLimit] = useState(false);
  const scanPanel = !authReady ? (
    <ViewLoading>{m.auth.pleaseWait}</ViewLoading>
  ) : !signedIn ? (
    <Blueprint className="pk-owned">
      <div className="pk-owned-empty">
        <img src={spriteUrl(SHINX_ID)} alt="" className="pk-owned-empty-sprite is-dim" />
        <p className="pk-owned-note">{copy.signInRequired}</p>
        <div className="pk-import-actions">
          <button type="button" className="btn pk-nav" onClick={onSignIn}>
            {m.nav.signIn}
          </button>
          <button type="button" className="btn pk-nav" onClick={onLogIn}>
            {m.nav.logIn}
          </button>
        </div>
      </div>
    </Blueprint>
  ) : (
    <BoxScanner
      index={index}
      indexLoading={indexLoading}
      game={game}
      prog={prog}
      onCommit={onCommit}
      onQuota={(next) => setGlobalLimit(!!next?.global_limit_reached && !next?.exempt)}
    />
  );

  return (
    <div className="pk-page pk-scan-page">
      <header className="pk-scan-head">
        <p className="pk-kicker">{m.nav.scan}</p>
        <h1>{copy.title}</h1>
        <p>{copy.body}</p>
      </header>
      {globalLimit ? (
        <div className="pk-scan-row">
          <ScanLimits copy={copy} />
          <Blueprint className="pk-scan-limits pk-scan-alert">
            <TriangleAlert />
            <h2>{copy.globalLimitTitle}</h2>
            <p>{copy.globalLimitBody}</p>
            <p>{copy.globalLimitWhy}</p>
          </Blueprint>
        </div>
      ) : (
        <ScanLimits copy={copy} />
      )}
      <div className="pk-scan-row">
        {scanPanel}
        <Blueprint className="pk-scan-limits pk-scan-transfer">
          <h2>{copy.transferTitle}</h2>
          <p>{copy.transferLead}</p>
          <h3>{copy.captureTitle}</h3>
          <p>{copy.captureBody}</p>
          <h3>{copy.appTitle}</h3>
          <p>{copy.appBody}</p>
          <p>{copy.appAfter}</p>
          <h3>{copy.qrTitle}</h3>
          <p>{copy.qrBody}</p>
          <p>{copy.qrAfter}</p>
          <h3>{copy.computerTitle}</h3>
          <p>{copy.computerBody}</p>
        </Blueprint>
      </div>
    </div>
  );
}

function ScanLimits({ copy }: { copy: ReturnType<typeof useI18n>["messages"]["scanner"] }) {
  return (
    <Blueprint className="pk-scan-limits">
      <h2>{copy.limitsTitle}</h2>
      <p>
        {copy.disclaimerBody} {copy.disclaimerBank} {copy.limitsCost} {copy.limitsDaily} {copy.limitsNew} {copy.limitsGlobal}
      </p>
    </Blueprint>
  );
}

function TriangleAlert() {
  return (
    <svg className="pk-scan-alert-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}
