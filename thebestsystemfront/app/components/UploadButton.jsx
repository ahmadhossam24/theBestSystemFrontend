"use client";

import { useRef, useState } from "react";
import { parseWorkbookRows } from "../lib/importExcel";
import UploadPreviewModal from "./UploadPreviewModal";

export default function UploadButton({ columns, onImport }) {
  const inputRef = useRef(null);
  const [pending, setPending] = useState(null); // { rows, fileName }
  const [error, setError] = useState("");

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // so selecting the same file twice still fires onChange
    if (!file) return;
    setError("");
    try {
      const rows = await parseWorkbookRows(file, columns);
      if (rows.length === 0) {
        setError("No usable rows found in that file.");
        return;
      }
      setPending({ rows, fileName: file.name });
    } catch (err) {
      setError("Couldn't read that file — make sure it's a valid .xlsx or .xls file.");
    }
  };

  return (
    <>
      <button
        onClick={() => inputRef.current?.click()}
        className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
      >
        + Upload file
      </button>
      <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}

      {pending && (
        <UploadPreviewModal
          fileName={pending.fileName}
          rows={pending.rows}
          columns={columns}
          onCancel={() => setPending(null)}
          onConfirm={() => {
            onImport(pending.rows);
            setPending(null);
          }}
        />
      )}
    </>
  );
}
