
"use client";

import React, { useRef, useState } from "react";
import JSZip from "jszip";
import Table from "./local/Table";
import {
  handleCellChange,
  handleDelete,
  handleInputChange,
} from "./utils/utils";
import {
  _type_TextField,
  SidebarProps,
  _type_CsvResult,
  Notice,
} from "@/types/types";
import { FONT_FAMILIES } from "./constants";
import { uid } from "./utils/utils";

export default function Sidebar({
  certificate,
  fields,
  setFields,
  selectedId,
  setSelectedId,
  onCsvDataChange,
  imgRef,
}: SidebarProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [csvData, setCSVData] = useState<_type_CsvResult | null>(null);
  const [isTableOpen, setIsTableOpen] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pastedCsv, setPastedCsv] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  // CSV state helpers

  const setCSVDataWithCallback = (
    value: React.SetStateAction<_type_CsvResult | null>
  ) => {
    const next = typeof value === "function" ? value(csvData) : value;
    setCSVData(next);
    onCsvDataChange(next);
  };

  const rowCount = csvData?.ok
    ? Math.max(
      0,
      ...csvData.headers.map((h) => csvData.rows[h]?.length ?? 0)
    )
    : 0;

  // Parse pasted CSV and convert it into the existing CSV data structure.

  function handlePasteCsv() {
    const text = pastedCsv.trim();

    if (!text) {
      setNotice({ type: "error", message: "Please enter CSV data." });
      return;
    }

    const records: string[][] = [];
    let row: string[] = [];
    let cell = "";
    let quoted = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      if (char === '"' && quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (char === '"') {
        quoted = !quoted;
      } else if (char === "," && !quoted) {
        row.push(cell);
        cell = "";
      } else if ((char === "\n" || char === "\r") && !quoted) {
        if (char === "\r" && text[i + 1] === "\n") i++;

        row.push(cell);

        if (row.some((value) => value.trim() !== "")) {
          records.push(row);
        }

        row = [];
        cell = "";
      } else {
        cell += char;
      }
    }

    if (quoted) {
      setNotice({
        type: "error",
        message: "CSV contains an unclosed quotation mark.",
      });
      return;
    }

    row.push(cell);

    if (row.some((value) => value.trim() !== "")) {
      records.push(row);
    }

    if (records.length < 2) {
      setNotice({
        type: "error",
        message: "Include column headers and at least one data row.",
      });
      return;
    }

    const headers = records[0].map((header, index) =>
      (index === 0 ? header.replace(/^\uFEFF/, "") : header).trim()
    );

    if (headers.some((header) => !header)) {
      setNotice({
        type: "error",
        message: "Column names cannot be empty.",
      });
      return;
    }

    if (new Set(headers).size !== headers.length) {
      setNotice({
        type: "error",
        message: "Column names must be unique.",
      });
      return;
    }

    const rows: Record<string, string[]> = Object.fromEntries(
      headers.map((header, columnIndex) => [
        header,
        records.slice(1).map((record) => record[columnIndex] ?? ""),
      ])
    );

    const result: _type_CsvResult = {
      ok: true,
      headers,
      rows,
      filename: "pasted-data.csv",
    };

    setCSVDataWithCallback(result);
    setShowPasteModal(false);
    setPastedCsv("");
    setNotice(null);
  }

  // Field helpers

  function addField(column: string) {
    const newField: _type_TextField = {
      id: uid(),
      column,
      x: 0.1,
      y: 0.5,
      fontSize: 32,
      color: "#000000",
      fontFamily: "Inter",
      bold: false,
      italic: false,
      underline: false,
    };

    setFields((prev) => [...prev, newField]);
    setSelectedId(newField.id);
  }

  function updateSelected(patch: Partial<_type_TextField>) {
    setFields((prev) =>
      prev.map((f) => (f.id === selectedId ? { ...f, ...patch } : f))
    );
  }

  function removeField(id: string) {
    setFields((prev) => prev.filter((f) => f.id !== id));

    if (selectedId === id) {
      setSelectedId(null);
    }
  }

  // Generate certificates and download ZIP.

  async function handleGenerate() {
    if (
      !csvData?.ok ||
      !imgRef.current ||
      !certificate ||
      fields.length === 0 ||
      rowCount === 0 ||
      generating
    ) {
      return;
    }

    setGenerating(true);
    setProgress(0);

    try {
      const img = imgRef.current;
      const zip = new JSZip();
      const offscreen = document.createElement("canvas");

      offscreen.width = img.naturalWidth;
      offscreen.height = img.naturalHeight;

      const ctx = offscreen.getContext("2d");

      if (!ctx) {
        throw new Error("Unable to create the certificate canvas.");
      }

      const ext = certificate.type === "image/png" ? "png" : "jpg";
      const mimeType =
        certificate.type === "image/png" ? "image/png" : "image/jpeg";

      for (let i = 0; i < rowCount; i++) {
        ctx.clearRect(0, 0, offscreen.width, offscreen.height);
        ctx.drawImage(img, 0, 0);

        const rowValues: Record<string, string> = {};

        for (const header of csvData.headers) {
          rowValues[header] = csvData.rows[header]?.[i] ?? "";
        }

        for (const field of fields) {
          const text = rowValues[field.column] ?? "";
          const weight = field.bold ? "bold" : "normal";
          const style = field.italic ? "italic" : "normal";

          ctx.font = `${style} ${weight} ${field.fontSize}px "${field.fontFamily}"`;
          ctx.fillStyle = field.color;
          ctx.textBaseline = "top";

          ctx.fillText(
            text,
            field.x * offscreen.width,
            field.y * offscreen.height
          );

          if (field.underline) {
            const metrics = ctx.measureText(text);
            const textY = field.y * offscreen.height;

            ctx.beginPath();
            ctx.strokeStyle = field.color;
            ctx.lineWidth = Math.max(1, field.fontSize / 16);
            ctx.moveTo(
              field.x * offscreen.width,
              textY + field.fontSize
            );
            ctx.lineTo(
              field.x * offscreen.width + metrics.width,
              textY + field.fontSize
            );
            ctx.stroke();
          }
        }

        const firstVal =
          rowValues[fields[0]?.column] ?? `certificate_${i + 1}`;

        const safeName =
          firstVal.replace(/[^a-z0-9_-]/gi, "_").slice(0, 60) ||
          `certificate_${i + 1}`;

        const blob = await new Promise<Blob>((resolve, reject) => {
          offscreen.toBlob(
            (result) => {
              if (result) resolve(result);
              else reject(new Error("Failed to generate certificate image."));
            },
            mimeType,
            0.95
          );
        });

        zip.file(
          `${String(i + 1).padStart(3, "0")}_${safeName}.${ext}`,
          blob
        );

        setProgress(Math.round(((i + 1) / rowCount) * 100));

        if (i % 10 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");

      a.href = url;
      a.download = "certificates.zip";
      a.click();

      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setNotice({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to generate certificates.",
      });
    } finally {
      setGenerating(false);
      setProgress(0);
    }
  }

  const selected = fields.find((f) => f.id === selectedId) ?? null;
  const usedColumns = new Set(fields.map((f) => f.column));

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col overflow-y-auto border-r border-black/10 bg-white text-black">
      {/* CSV upload and paste controls */}

      <div className="space-y-3 p-4">
        {!csvData?.ok ? (
          <>
            <button
              type="button"
              onClick={() => {
                setPastedCsv("");
                setNotice(null);
                setShowPasteModal(true);
              }}
              className="flex w-full cursor-pointer items-center justify-center rounded-xl border border-dashed border-black/20 bg-white p-2 text-center transition-all hover:border-black/50 hover:bg-black/2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
            >
              Add fields
            </button>

            <p className="text-center">or</p>

            <label
              htmlFor="csv-data"
              className="group flex cursor-pointer items-center justify-center gap-3 rounded-xl border border-dashed border-black/20 bg-white py-2 text-center transition-all hover:border-black/50 hover:bg-black/2 focus-within:ring-2 focus-within:ring-black"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-black/10 bg-black/3 transition-colors group-hover:bg-black/6">
                <img
                  src="/icons/upload.svg"
                  alt="Upload"
                  className="h-5 w-5"
                />
              </span>

              <div>
                <span className="text-sm font-medium">
                  Upload a CSV file
                </span>
                <br />
                <span className="mt-3 text-[10px] font-bold uppercase tracking-wider text-[#d32323]">
                  CSV · Max 5 MB
                </span>
              </div>

              <input
                ref={inputRef}
                type="file"
                name="csv-data"
                id="csv-data"
                accept=".csv,text/csv"
                onChange={(e) =>
                  handleInputChange(
                    e,
                    setCSVDataWithCallback,
                    setNotice,
                    setIsTableOpen
                  )
                }
                className="sr-only"
              />
            </label>
          </>
        ) : (
          <div className="rounded-xl border border-black/10 p-3">
            <p className="text-xs text-black/45">
              {rowCount} {rowCount === 1 ? "row" : "rows"} ·{" "}
              {csvData.headers.length}{" "}
              {csvData.headers.length === 1 ? "column" : "columns"}
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsTableOpen(true)}
                className="rounded-lg border border-black/15 bg-white px-3 py-2 text-xs font-medium text-black transition-colors hover:bg-[#d8d8d8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
              >
                View
              </button>

              <button
                type="button"
                onClick={() =>
                  handleDelete(
                    setCSVDataWithCallback,
                    setNotice,
                    setIsTableOpen,
                    inputRef
                  )
                }
                className="rounded-lg border border-black/15 px-3 py-2 text-xs font-medium text-black/70 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                Delete
              </button>
            </div>

          </div>
        )}

        {notice && notice.type !== "success" && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-700"
          >
            <p className="wrap-break-words">{notice.message}</p>
          </div>
        )}

        <hr className="opacity-20" />
      </div>

      {csvData != null && (
        <>
          {/* CSV columns */}

          <section className="border-t border-black/10 p-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-black/60">
              CSV Columns
            </h3>

            {!csvData.ok ? (
              <div className="rounded-lg border border-black/10 bg-black/2 px-3 py-4 text-center">
                <p className="text-xs font-medium text-black/60">
                  No columns yet
                </p>
                <p className="mt-1 text-[11px] leading-5 text-black/40">
                  Upload or paste CSV data to place columns on the certificate.
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {csvData.headers.map((header) => {
                  const already = usedColumns.has(header);

                  return (
                    <button
                      key={header}
                      type="button"
                      title={
                        already
                          ? "Already placed"
                          : `Place "${header}" on certificate`
                      }
                      onClick={() => !already && addField(header)}
                      className={`rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${already
                        ? "cursor-not-allowed border-black/10 bg-black/5 text-black/30"
                        : "cursor-pointer border-black/15 bg-white text-black/75 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
                        }`}
                    >
                      {header}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Placed fields */}

          <section className="border-t border-black/10 p-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-black/60">
              Placed Fields
            </h3>

            {fields.length === 0 ? (
              <p className="text-xs text-black/40">
                No fields placed yet.
              </p>
            ) : (
              <ul className="space-y-1">
                {fields.map((f) => (
                  <li
                    key={f.id}
                    onClick={() => setSelectedId(f.id)}
                    className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-xs transition-colors ${f.id === selectedId
                      ? "border-blue-400 bg-blue-50 text-blue-700"
                      : "border-black/10 bg-white text-black/70 hover:bg-black/3"
                      }`}
                  >
                    <span className="truncate font-medium">
                      {f.column}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeField(f.id);
                      }}
                      className="ml-2 shrink-0 text-black/30 hover:text-red-500"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Style panel */}

          {selected && (
            <section className="space-y-3 border-t border-black/10 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-black/60">
                Style — {selected.column}
              </h3>

              <label className="flex items-center justify-between gap-2 text-xs">
                <span className="text-black/60">Size</span>
                <input
                  type="number"
                  min={8}
                  max={300}
                  value={selected.fontSize}
                  onChange={(e) =>
                    updateSelected({ fontSize: Number(e.target.value) })
                  }
                  className="w-20 rounded border border-black/15 px-2 py-1 text-right text-xs"
                />
              </label>

              <label className="flex items-center justify-between gap-2 text-xs">
                <span className="text-black/60">Color</span>
                <input
                  type="color"
                  value={selected.color}
                  onChange={(e) =>
                    updateSelected({ color: e.target.value })
                  }
                  className="h-7 w-10 cursor-pointer rounded border border-black/15"
                />
              </label>

              <label className="flex items-center justify-between gap-2 text-xs">
                <span className="text-black/60">Font</span>
                <select
                  value={selected.fontFamily}
                  onChange={(e) =>
                    updateSelected({ fontFamily: e.target.value })
                  }
                  className="rounded border border-black/15 px-2 py-1 text-xs"
                >
                  {FONT_FAMILIES.map((font) => (
                    <option key={font} value={font}>
                      {font}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    updateSelected({ bold: !selected.bold })
                  }
                  className={`flex-1 rounded border py-1.5 text-xs font-bold transition-colors ${selected.bold
                    ? "border-blue-400 bg-blue-50 text-blue-700"
                    : "border-black/15 bg-white text-black/60 hover:bg-black/3"
                    }`}
                >
                  B
                </button>

                <button
                  type="button"
                  onClick={() =>
                    updateSelected({ italic: !selected.italic })
                  }
                  className={`flex-1 rounded border py-1.5 text-xs italic transition-colors ${selected.italic
                    ? "border-blue-400 bg-blue-50 text-blue-700"
                    : "border-black/15 bg-white text-black/60 hover:bg-black/3"
                    }`}
                >
                  I
                </button>

                <button
                  type="button"
                  onClick={() =>
                    updateSelected({ underline: !selected.underline })
                  }
                  className={`flex-1 rounded border py-1.5 text-xs underline transition-colors ${selected.underline
                    ? "border-blue-400 bg-blue-50 text-blue-700"
                    : "border-black/15 bg-white text-black/60 hover:bg-black/3"
                    }`}
                >
                  U
                </button>
              </div>

              <div className="flex gap-2">
                <label className="flex flex-1 flex-col gap-1 text-xs text-black/60">
                  X %
                  <input
                    type="number"
                    min={0}
                    max={99}
                    step={0.5}
                    value={+(selected.x * 100).toFixed(1)}
                    onChange={(e) =>
                      updateSelected({
                        x: Number(e.target.value) / 100,
                      })
                    }
                    className="rounded border border-black/15 px-2 py-1 text-xs"
                  />
                </label>

                <label className="flex flex-1 flex-col gap-1 text-xs text-black/60">
                  Y %
                  <input
                    type="number"
                    min={0}
                    max={99}
                    step={0.5}
                    value={+(selected.y * 100).toFixed(1)}
                    onChange={(e) =>
                      updateSelected({
                        y: Number(e.target.value) / 100,
                      })
                    }
                    className="rounded border border-black/15 px-2 py-1 text-xs"
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={() => removeField(selected.id)}
                className="w-full rounded-lg border border-red-200 bg-red-50 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100"
              >
                Remove field
              </button>
            </section>
          )}

          {/* Generate ZIP */}

          <section className="mt-auto border-t border-black/10 p-4">
            {csvData.ok && rowCount > 0 && fields.length > 0 ? (
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating}
                className="w-full rounded-xl bg-black py-3 text-sm font-semibold text-white transition-colors hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {generating
                  ? `Generating… ${progress}%`
                  : `Generate ${rowCount} Certificate${rowCount !== 1 ? "s" : ""
                  } & Download ZIP`}
              </button>
            ) : (
              <div className="rounded-xl border border-black/10 bg-black/3 py-3 text-center text-xs text-black/40">
                {!csvData.ok
                  ? "Upload or paste a CSV to generate"
                  : fields.length === 0
                    ? "Place at least one field"
                    : "No rows in CSV"}
              </div>
            )}
          </section>

          {/* Existing CSV table modal */}

          {isTableOpen && csvData.ok && (
            <Table
              csvData={csvData}
              rowCount={rowCount}
              onCellChange={(header, rowIndex, value) =>
                handleCellChange(
                  header,
                  rowIndex,
                  value,
                  setCSVDataWithCallback
                )
              }
              onClose={() => setIsTableOpen(false)}
            />
          )}
        </>
      )}

      {/* Paste CSV popup */}

      {showPasteModal && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
          onClick={() => setShowPasteModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="paste-csv-title"
            className="w-full max-w-xl rounded-2xl border border-black/10 bg-white p-5 text-black shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2
                  id="paste-csv-title"
                  className="text-base font-semibold"
                >
                  Add fields from CSV
                </h2>
                <p className="mt-1 text-xs text-black/50">
                  Paste your CSV data, including column headers.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                aria-label="Close"
                className="text-xl text-black/50 hover:text-black"
              >
                ×
              </button>
            </div>

            <textarea
              autoFocus
              value={pastedCsv}
              onChange={(e) => setPastedCsv(e.target.value)}
              placeholder={`Name,College
Saumya Kanti Sarma,Pillai College
Roshan Singha,DMR College
Susanti Sinha,ABC College`}
              className="h-64 w-full resize-y rounded-xl border border-black/15 p-3 font-mono text-sm outline-none focus:border-black/40 focus:ring-2 focus:ring-black/10"
            />

            <p className="mt-2 text-xs text-black/45">
              First row contains column names. Each following row represents
              one certificate. Values containing commas should be enclosed in
              double quotes.
            </p>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="rounded-lg border border-black/15 px-4 py-2 text-sm hover:bg-black/5"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handlePasteCsv}
                className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/80"
              >
                Use CSV
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
