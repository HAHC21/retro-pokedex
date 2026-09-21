import { useRef, useState } from "react";
import { Blueprint } from "./Blueprint";
import { uploadParsedOwnedPokemonBatch, type OwnedPokemonInput } from "../collectionApi";
import { isPkFilename, parsePkFile } from "../pkParse";

type PkBulkImportProps = {
  isStaff: boolean;
  game: string;
  onImported: () => void;
};

type ImportPhase = "idle" | "parsing" | "saving" | "done";

export function PkBulkImport({ isStaff, game, onImported }: PkBulkImportProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<ImportPhase>("idle");
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const busy = phase === "parsing" || phase === "saving";

  if (!isStaff) {
    return null;
  }

  async function processFiles(list: FileList | null) {
    if (!list?.length) {
      return;
    }
    const unique = uniquePkFiles([...list]);
    if (!unique.length) {
      setError("No .pk* or .pb7 files in that selection.");
      return;
    }
    setError(null);
    setPhase("parsing");
    setProgress(`Reading 0 / ${unique.length}`);
    const items: Array<OwnedPokemonInput & { filename?: string }> = [];
    for (let index = 0; index < unique.length; index += 1) {
      const file = unique[index];
      try {
        const parsed = await parsePkFile(file, game);
        items.push({ ...parsed, filename: file.name });
      } catch {
        /* skip unreadable dumps */
      }
      if (index === unique.length - 1 || index % 20 === 19) {
        setProgress(`Reading ${index + 1} / ${unique.length}`);
        await yieldUi();
      }
    }
    if (!items.length) {
      setPhase("idle");
      setError(`Could not parse any of ${unique.length} files.`);
      return;
    }
    setPhase("saving");
    setProgress(`Saving ${items.length} specimens…`);
    try {
      const result = await uploadParsedOwnedPokemonBatch(items, `${unique.length} pk files`);
      const skipped = unique.length - items.length + result.failed;
      setPhase("done");
      setProgress(
        skipped
          ? `Saved ${result.saved}. Skipped ${skipped} (unreadable or invalid).`
          : `Saved ${result.saved} specimens from PK files.`,
      );
      onImported();
    } catch (err) {
      setPhase("idle");
      setError(err instanceof Error ? err.message : "Could not save those Pokémon files.");
    }
  }

  return (
    <Blueprint className="pk-import">
      <div className="pk-import-copy">
        <h2>Import PK files</h2>
        <p>
          Choose a folder or many files. Each specimen is assigned to the game it was met in. Duplicate copies of the
          same filename and size are skipped.
        </p>
      </div>
      <div className="pk-import-actions">
        <button type="button" className="btn pk-nav" disabled={busy} onClick={() => fileRef.current?.click()}>
          Choose files
        </button>
        <button type="button" className="btn pk-nav" disabled={busy} onClick={() => folderRef.current?.click()}>
          Choose folder
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        className="pk-import-input"
        accept=".pk1,.pk2,.pk3,.pk4,.pk5,.pk6,.pk7,.pk8,.pk9,.pb7"
        multiple
        disabled={busy}
        onChange={(event) => {
          void processFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <input
        ref={folderRef}
        type="file"
        className="pk-import-input"
        accept=".pk1,.pk2,.pk3,.pk4,.pk5,.pk6,.pk7,.pk8,.pk9,.pb7"
        multiple
        disabled={busy}
        {...{ webkitdirectory: "", directory: "" }}
        onChange={(event) => {
          void processFiles(event.target.files);
          event.target.value = "";
        }}
      />
      {progress ? <p className="pk-owned-note">{progress}</p> : null}
      {error ? <p className="pk-spawn-empty">{error}</p> : null}
    </Blueprint>
  );
}

function uniquePkFiles(files: File[]): File[] {
  const seen = new Set<string>();
  const next: File[] = [];
  files.forEach((file) => {
    if (!isPkFilename(file.name)) {
      return;
    }
    const key = `${file.name}:${file.size}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    next.push(file);
  });
  return next;
}

function yieldUi(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 0);
  });
}
