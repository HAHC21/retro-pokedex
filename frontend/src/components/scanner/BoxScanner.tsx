import { useEffect, useMemo, useRef, useState } from "react";
import {
  analyzeBoxScreenshot,
  applyDraftToProgress,
  BOX_SOURCE_IDS,
  draftsFromGemini,
  extractBoxTiles,
  fetchScanQuota,
  loadImageFile,
  occupiedCount,
  regionForSource,
} from "../../scanner";
import type { ScanQuota } from "../../scanner";
import type { BoxSourceId, SlotScanDraft } from "../../scanner/types";
import { navBtnStyle } from "../../format";
import { fill } from "../../i18n/runtime";
import { useI18n } from "../../i18n/context";
import { gameLabel } from "../../progress";
import type { DexIndex, Progress } from "../../types";
import { Blueprint } from "../Blueprint";
import { Modal } from "../Modal";
import { ViewLoading } from "../ViewLoading";
import { DraftReviewGrid } from "./DraftReviewGrid";

type BoxScannerProps = {
  index: DexIndex;
  indexLoading: boolean;
  game: string;
  prog: Progress;
  onCommit: (next: Progress) => Promise<void> | void;
  onQuota?: (quota: ScanQuota | null) => void;
};

type Phase = "idle" | "working" | "review";

export function BoxScanner({ index, indexLoading, game, prog, onCommit, onQuota }: BoxScannerProps) {
  const { messages: m } = useI18n();
  const copy = m.scanner;
  const fileRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [source, setSource] = useState<BoxSourceId>("sv");
  const [slots, setSlots] = useState<SlotScanDraft[]>([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [quota, setQuota] = useState<ScanQuota | null>(null);
  const speciesIds = useMemo(
    () =>
      Object.keys(index.names)
        .map(Number)
        .filter((id) => Number.isFinite(id) && id > 0)
        .sort((left, right) => left - right),
    [index.names],
  );

  function applyQuota(next: ScanQuota | null) {
    setQuota(next);
    onQuota?.(next);
  }

  useEffect(() => {
    let cancelled = false;
    void fetchScanQuota()
      .then((next) => {
        if (!cancelled) {
          applyQuota(next);
        }
      })
      .catch(() => {
        if (!cancelled) {
          applyQuota(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function reset(notice = "") {
    setPhase("idle");
    setSlots([]);
    setStatus(notice);
    setBusy(false);
    if (fileRef.current) {
      fileRef.current.value = "";
    }
  }

  async function scanImage(file: File, nextImage: HTMLImageElement, nextSource: BoxSourceId) {
    setPhase("working");
    setBusy(true);
    setError(null);
    setStatus(copy.scanning);
    try {
      const [analyzed, tiles] = await Promise.all([
        analyzeBoxScreenshot(file, nextSource),
        Promise.resolve(extractBoxTiles(nextImage, regionForSource(nextSource, nextImage))),
      ]);
      setSlots(draftsFromGemini(analyzed, tiles, index.names));
      setPhase("review");
      void fetchScanQuota().then(applyQuota).catch(() => undefined);
    } catch (err) {
      const limited = err instanceof Error && (err.message === "scan_limit" || err.message === "global_budget");
      setError(err instanceof Error && err.message === "global_budget" ? copy.globalLimitBody : limited ? copy.limitReached : err instanceof Error && err.message ? err.message : copy.failedIndex);
      if (limited) {
        void fetchScanQuota().then(applyQuota).catch(() => undefined);
      }
      setPhase("idle");
    } finally {
      setBusy(false);
      setStatus("");
    }
  }

  async function onPick(list: FileList | null) {
    const file = list?.[0];
    if (!file) {
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError(copy.noImage);
      return;
    }
    setError(null);
    try {
      const nextImage = await loadImageFile(file);
      await scanImage(file, nextImage, source);
    } catch {
      setError(copy.noImage);
    }
  }

  async function confirm() {
    const next = applyDraftToProgress(prog, game, slots);
    setBusy(true);
    setError(null);
    try {
      await onCommit(next);
      reset(fill(copy.saved, { count: occupiedCount(slots), game: gameLabel(game) }));
    } catch {
      setError(copy.failed);
      setPhase("review");
    } finally {
      setBusy(false);
    }
  }

  const reviewCopy = {
    reviewBody: copy.reviewBody,
    slot: copy.slot,
    empty: copy.empty,
    markEmpty: copy.markEmpty,
    markOccupied: copy.markOccupied,
    candidates: copy.candidates,
    search: copy.search,
    searchPlaceholder: copy.searchPlaceholder,
    noCandidates: copy.noCandidates,
    unknown: copy.unknown,
    high: copy.high,
    medium: copy.medium,
    low: copy.low,
    crop: copy.crop,
    match: copy.match,
    shiny: copy.shiny,
    confirm: copy.confirm,
    confirmEmpty: copy.confirmEmpty,
    cancel: copy.cancel,
    numberFallback: m.dash.numberFallback,
  };

  return (
    <>
      <Blueprint className="pk-import pk-scan">
        <div className="pk-import-copy">
          <h2>{copy.source}</h2>
          <p>{copy.sourceBody}</p>
        </div>
        <div className="pk-scan-sources" role="radiogroup" aria-label={copy.source}>
          {BOX_SOURCE_IDS.map((id) => (
            <button
              key={id}
              type="button"
              className="btn pk-nav"
              style={navBtnStyle(source === id)}
              aria-pressed={source === id}
              onClick={() => setSource(id)}
            >
              {sourceLabel(id, copy)}
            </button>
          ))}
        </div>
        <p className="pk-owned-note">{fill(copy.gameNote, { game: gameLabel(game) })}</p>
        {quota && !quota.exempt ? (
          <p className="pk-owned-note">
            {quota.new_account
              ? fill(copy.remainingNew, { count: quota.remaining })
              : fill(copy.remainingDaily, { count: quota.remaining })}
            {quota.next_available_at
              ? ` ${fill(copy.wait, { when: new Date(quota.next_available_at).toLocaleString() })}`
              : ""}
          </p>
        ) : null}
        <div className="pk-import-actions">
          <button
            type="button"
            className="btn pk-nav"
            disabled={
              indexLoading ||
              speciesIds.length === 0 ||
              busy ||
              !quota ||
              (!quota.exempt && (quota.remaining === 0 || quota.global_limit_reached))
            }
            onClick={() => fileRef.current?.click()}
          >
            {copy.upload}
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          className="pk-import-input"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={(event) => {
            void onPick(event.target.files);
            event.target.value = "";
          }}
        />
        {status && phase === "idle" ? <p className="pk-owned-note">{status}</p> : null}
        {error && phase === "idle" ? <p className="pk-spawn-empty">{error}</p> : null}
      </Blueprint>

      <Modal open={phase !== "idle"} title={phase === "review" ? copy.reviewTitle : copy.scanning} onClose={() => reset()} size="xl">
        {phase === "working" ? <ViewLoading>{status || copy.scanning}</ViewLoading> : null}
        {phase === "review" ? (
          <>
            {error ? <p className="pk-spawn-empty">{error}</p> : null}
            <DraftReviewGrid
              slots={slots}
              names={index.names}
              copy={reviewCopy}
              fill={fill}
              confirmLabel={fill(copy.confirm, { count: occupiedCount(slots), game: gameLabel(game) })}
              onChange={setSlots}
              onConfirm={() => void confirm()}
              onCancel={() => reset()}
              busy={busy}
            />
          </>
        ) : null}
      </Modal>
    </>
  );
}

function sourceLabel(
  id: BoxSourceId,
  copy: {
    sourceHome: string;
    sourceBank: string;
    sourceSv: string;
    sourceSwsh: string;
    sourceSwitch2: string;
    sourceSwitch: string;
  },
): string {
  if (id === "home") {
    return copy.sourceHome;
  }
  if (id === "bank") {
    return copy.sourceBank;
  }
  if (id === "sv") {
    return copy.sourceSv;
  }
  if (id === "swsh") {
    return copy.sourceSwsh;
  }
  if (id === "switch2") {
    return copy.sourceSwitch2;
  }
  return copy.sourceSwitch;
}
