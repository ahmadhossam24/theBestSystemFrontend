"use client";

import { useMemo, useRef, useState } from "react";
import { convertRows, planImport, readWorkbookFile } from "../lib/data/xlsxImport";
import ImportPreviewModal from "./ImportPreviewModal";

/**
 * "Import Excel" button + preview modal.
 *  columns:   the table's own columns (no dataset extras) — headers are matched against these
 *  onConfirm: async ({ records, fileName }) => void   (the page saves them; throw to show an error)
 */
export default function ImportButton({ table, columns, onConfirm, disabled }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [data, setData] = useState(null); // { sheetName, sheetNames, headers, rows }
  const [phase, setPhase] = useState("idle"); // idle | reading | preview | importing
  const [error, setError] = useState("");
  const [readError, setReadError] = useState("");

  const plan = useMemo(() => (data ? planImport(data.headers, columns) : null), [data, columns]);
  const converted = useMemo(() => (data && plan ? convertRows(data.rows, plan) : null), [data, plan]);

  const read = async (f, sheet) => {
    setPhase("reading");
    setError("");
    try {
      setData(await readWorkbookFile(f, sheet));
      setPhase("preview");
    } catch (e) {
      setReadError(e?.message || "Could not read this file.");
      setPhase("idle");
      setData(null);
    }
  };

  const onPick = (e) => {
    const f = e.target.files?.[0];
    e.target.value = ""; // allow choosing the same file again
    if (!f) return;
    setReadError("");
    setFile(f);
    read(f);
  };

  const close = () => {
    setPhase("idle");
    setData(null);
    setFile(null);
    setError("");
  };

  const confirm = async () => {
    setPhase("importing");
    setError("");
    try {
      await onConfirm({ records: converted.records, fileName: file.name });
      close();
    } catch (e) {
      setError(e?.message || "Import failed.");
      setPhase("preview");
    }
  };

  return (
    <>
      <input ref={inputRef} type="file" accept=".xlsx,.xls" onChange={onPick} className="hidden" aria-label="Excel file" data-testid="import-file" />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={disabled || phase === "reading"}
        className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {phase === "reading" ? "Reading file…" : "Import Excel"}
      </button>
      {readError && <span data-testid="import-read-error" className="text-xs text-red-600">{readError}</span>}

      {(phase === "preview" || phase === "importing") && data && (
        <ImportPreviewModal
          table={table}
          info={{ fileName: file.name, sheetName: data.sheetName, sheetNames: data.sheetNames, headers: data.headers }}
          plan={plan}
          converted={converted}
          busy={phase === "importing"}
          error={error}
          onSheetChange={(s) => read(file, s)}
          onConfirm={confirm}
          onCancel={close}
        />
      )}
    </>
  );
}
