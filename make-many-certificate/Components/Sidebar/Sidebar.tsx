import React, { useRef, useState } from "react";
import JSZip from "jszip";
import type { CertificateInterface, CsvResult, Notice } from "@/types/types";
import Table from "./local/Table";
import { handleCellChange, handleDelete, handleInputChange } from "./utils/utils";

// ─── TextField type (shared with canvas) ─────────────────────────────────────

export interface TextField {
  id: string;
  column: string;
  x: number;       // 0-1 normalised to image width
  y: number;       // 0-1 normalised to image height
  fontSize: number;
  color: string;
  fontFamily: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2);
}

const FONT_FAMILIES = ["Inter", "Arial", "Georgia", "Courier New", "Times New Roman"];

// ─── Props ────────────────────────────────────────────────────────────────────
// fields and selectedId are owned by the PAGE. The sidebar only reads them
// and asks the page to change them.

interface SidebarProps {
  certificate: CertificateInterface | null;
  fields: TextField[];
  setFields: React.Dispatch<React.SetStateAction<TextField[]>>;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  onCsvDataChange: (data: CsvResult | null) => void;
  imgRef: React.RefObject<HTMLImageElement | null>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Sidebar({
  certificate,
  fields,
  setFields,
  selectedId,
  setSelectedId,
  onCsvDataChange,
  imgRef,
}: SidebarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [csvData, setCSVData] = useState<CsvResult | null>(null);
  const [isTableOpen, setIsTableOpen] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  // ── CSV state helpers ──────────────────────────────────────────────────────
  // Update local state, then tell the parent (outside the updater function).

  const setCSVDataWithCallback = (value: React.SetStateAction<CsvResult | null>) => {
    const next = typeof value === "function" ? value(csvData) : value;
    setCSVData(next);
    onCsvDataChange(next);
  };

  const rowCount = csvData?.ok
    ? Math.max(0, ...csvData.headers.map((h) => csvData.rows[h]?.length ?? 0))
    : 0;

  // ── Field helpers ──────────────────────────────────────────────────────────
  // Functional updates (prev => ...) always start from the LATEST fields,
  // including positions that were just dragged on the canvas.

  function addField(column: string) {
    const newField: TextField = {
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

  function updateSelected(patch: Partial<TextField>) {
    setFields((prev) =>
      prev.map((f) => (f.id === selectedId ? { ...f, ...patch } : f))
    );
  }

  function removeField(id: string) {
    setFields((prev) => prev.filter((f) => f.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  // ── Generate ZIP ───────────────────────────────────────────────────────────

  async function handleGenerate() {
    if (!csvData?.ok || !imgRef.current || !certificate || fields.length === 0) return;
    setGenerating(true);
    setProgress(0);

    const img = imgRef.current;
    const zip = new JSZip();
    const offscreen = document.createElement("canvas");
    offscreen.width = img.naturalWidth;
    offscreen.height = img.naturalHeight;
    const ctx = offscreen.getContext("2d")!;

    const ext = certificate.type === "image/png" ? "png" : "jpg";
    const mimeType = certificate.type === "image/png" ? "image/png" : "image/jpeg";

    for (let i = 0; i < rowCount; i++) {
      ctx.clearRect(0, 0, offscreen.width, offscreen.height);
      ctx.drawImage(img, 0, 0);

      const rowValues: Record<string, string> = {};
      for (const header of csvData.headers) {
        rowValues[header] = csvData.rows[header]?.[i] ?? "";
      }

      // Draw each field
      for (const field of fields) {
        const text = rowValues[field.column] ?? "";
        const weight = field.bold ? "bold" : "normal";
        const style = field.italic ? "italic" : "normal";
        ctx.font = `${style} ${weight} ${field.fontSize}px "${field.fontFamily}"`;
        ctx.fillStyle = field.color;
        ctx.textBaseline = "top";
        ctx.fillText(text, field.x * offscreen.width, field.y * offscreen.height);
      }

      const firstVal = rowValues[fields[0]?.column] ?? `certificate_${i + 1}`;
      const safeName =
        firstVal.replace(/[^a-z0-9_\-]/gi, "_").slice(0, 60) || `certificate_${i + 1}`;

      const blob = await new Promise<Blob>((resolve) => {
        offscreen.toBlob((b) => resolve(b!), mimeType, 0.95);
      });

      // Prefix with the row number so two people with the same name
      // don't overwrite each other inside the zip.
      zip.file(`${String(i + 1).padStart(3, "0")}_${safeName}.${ext}`, blob);
      setProgress(Math.round(((i + 1) / rowCount) * 100));

      if (i % 10 === 0) await new Promise((r) => setTimeout(r, 0));
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "certificates.zip";
    a.click();
    URL.revokeObjectURL(url);

    setGenerating(false);
    setProgress(0);
  }

  const selected = fields.find((f) => f.id === selectedId) ?? null;
  const usedColumns = new Set(fields.map((f) => f.column));

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col overflow-y-auto border-r border-black/10 bg-white text-black">

      {/* ── CSV Upload ── */}
      <div className="space-y-3 p-4">
        {!csvData?.ok ? (
          <label
            htmlFor="csv-data"
            className="group flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-black/20 bg-white px-4 py-6 text-center transition-all hover:border-black/50 hover:bg-black/2 focus-within:ring-2 focus-within:ring-black"
          >
            <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-black/10 bg-black/3 transition-colors group-hover:bg-black/6">
              <img src="/icons/upload.svg" alt="upload" className="h-5 w-5" />
            </span>
            <span className="text-sm font-medium">Upload a CSV file</span>
            <span className="mt-3 text-[10px] font-bold uppercase tracking-wider text-[#d32323]">
              CSV · Max 5 MB
            </span>
            <input
              ref={inputRef}
              type="file"
              name="csv-data"
              id="csv-data"
              accept=".csv,text/csv"
              onChange={(e) => handleInputChange(e, setCSVDataWithCallback, setNotice, setIsTableOpen)}
              className="sr-only"
            />
          </label>
        ) : (
          <div className="rounded-xl border border-black/10 p-3">
            <p className="text-xs text-black/45">
              {rowCount} {rowCount === 1 ? "row" : "rows"} · {csvData.headers.length}{" "}
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
                onClick={() => handleDelete(setCSVDataWithCallback, setNotice, setIsTableOpen, inputRef)}
                className="rounded-lg border border-black/15 px-3 py-2 text-xs font-medium text-black/70 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        )}

        {notice && notice.type !== "success" && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-700">
            <p className="wrap-break-words">{notice.message}</p>
          </div>
        )}
      </div>

      {/* ── CSV Columns → place on certificate ── */}
      <section className="border-t border-black/10 p-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-black/60">
          CSV Columns
        </h3>
        {!csvData?.ok ? (
          <div className="rounded-lg border border-black/10 bg-black/2 px-3 py-4 text-center">
            <p className="text-xs font-medium text-black/60">No columns yet</p>
            <p className="mt-1 text-[11px] leading-5 text-black/40">
              Upload a CSV to place columns on the certificate.
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {csvData.headers.map((header) => {
              const already = usedColumns.has(header);
              return (
                <button
                  key={header}
                  title={already ? "Already placed" : `Place "${header}" on certificate`}
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

      {/* ── Placed fields list ── */}
      <section className="border-t border-black/10 p-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-black/60">
          Placed Fields
        </h3>
        {fields.length === 0 ? (
          <p className="text-xs text-black/40">No fields placed yet.</p>
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
                <span className="truncate font-medium">{f.column}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); removeField(f.id); }}
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

      {/* ── Style panel for selected field ── */}
      {selected && (
        <section className="border-t border-black/10 p-4 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-black/60">
            Style — {selected.column}
          </h3>

          <label className="flex items-center justify-between gap-2 text-xs">
            <span className="text-black/60">Size</span>
            <input
              type="number" min={8} max={300}
              value={selected.fontSize}
              onChange={(e) => updateSelected({ fontSize: Number(e.target.value) })}
              className="w-20 rounded border border-black/15 px-2 py-1 text-right text-xs"
            />
          </label>

          <label className="flex items-center justify-between gap-2 text-xs">
            <span className="text-black/60">Color</span>
            <input
              type="color"
              value={selected.color}
              onChange={(e) => updateSelected({ color: e.target.value })}
              className="h-7 w-10 cursor-pointer rounded border border-black/15"
            />
          </label>

          <label className="flex items-center justify-between gap-2 text-xs">
            <span className="text-black/60">Font</span>
            <select
              value={selected.fontFamily}
              onChange={(e) => updateSelected({ fontFamily: e.target.value })}
              className="rounded border border-black/15 px-2 py-1 text-xs"
            >
              {FONT_FAMILIES.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </label>

          <div className="flex gap-2">
            <button
              onClick={() => updateSelected({ bold: !selected.bold })}
              className={`flex-1 rounded border py-1.5 text-xs font-bold transition-colors ${selected.bold
                ? "border-blue-400 bg-blue-50 text-blue-700"
                : "border-black/15 bg-white text-black/60 hover:bg-black/3"
                }`}
            >B</button>
            <button
              onClick={() => updateSelected({ italic: !selected.italic })}
              className={`flex-1 rounded border py-1.5 text-xs italic transition-colors ${selected.italic
                ? "border-blue-400 bg-blue-50 text-blue-700"
                : "border-black/15 bg-white text-black/60 hover:bg-black/3"
                }`}
            >I</button>
          </div>

          <div className="flex gap-2">
            <label className="flex flex-1 flex-col gap-1 text-xs text-black/60">
              X %
              <input
                type="number" min={0} max={99} step={0.5}
                value={+(selected.x * 100).toFixed(1)}
                onChange={(e) => updateSelected({ x: Number(e.target.value) / 100 })}
                className="rounded border border-black/15 px-2 py-1 text-xs"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-xs text-black/60">
              Y %
              <input
                type="number" min={0} max={99} step={0.5}
                value={+(selected.y * 100).toFixed(1)}
                onChange={(e) => updateSelected({ y: Number(e.target.value) / 100 })}
                className="rounded border border-black/15 px-2 py-1 text-xs"
              />
            </label>
          </div>

          <button
            onClick={() => removeField(selected.id)}
            className="w-full rounded-lg border border-red-200 bg-red-50 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors"
          >
            Remove field
          </button>
        </section>
      )}

      {/* ── Generate button ── */}
      <section className="mt-auto border-t border-black/10 p-4">
        {csvData?.ok && rowCount > 0 && fields.length > 0 ? (
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full rounded-xl bg-black py-3 text-sm font-semibold text-white transition-colors hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {generating
              ? `Generating… ${progress}%`
              : `Generate ${rowCount} Certificate${rowCount !== 1 ? "s" : ""} & Download ZIP`}
          </button>
        ) : (
          <div className="rounded-xl border border-black/10 bg-black/3 py-3 text-center text-xs text-black/40">
            {!csvData?.ok
              ? "Upload a CSV to generate"
              : fields.length === 0
                ? "Place at least one field"
                : "No rows in CSV"}
          </div>
        )}
      </section>

      {/* ── Table modal ── */}
      {isTableOpen && csvData?.ok && (
        <Table
          csvData={csvData}
          rowCount={rowCount}
          onCellChange={(header, rowIndex, value) =>
            handleCellChange(header, rowIndex, value, setCSVDataWithCallback)
          }
          onClose={() => setIsTableOpen(false)}
        />
      )}
    </aside>
  );
}