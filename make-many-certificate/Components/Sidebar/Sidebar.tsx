import { useRef, useState } from "react";
import type { CsvResult, Notice } from "./types";
import Table from "./local/Table";
import { handleCellChange, handleDelete, handleInputChange } from "./utils/utils";


export default function Sidebar() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [csvData, setCSVData] = useState<CsvResult | null>(null);
  const [isTableOpen, setIsTableOpen] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const rowCount = csvData?.ok
    ? Math.max(
      0,
      ...csvData.headers.map((header) => csvData.rows[header]?.length ?? 0)
    )
    : 0;



  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-black/10 bg-white text-black">


      {/* Upload section */}
      <div className="space-y-3 p-4">
        {!csvData?.ok ? (
          <label
            htmlFor="csv-data"
            className="group flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-black/20 bg-white px-4 py-6 text-center transition-all hover:border-black/50 hover:bg-black/2 focus-within:ring-2 focus-within:ring-black"
          >
            <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-black/10 bg-black/3 transition-colors group-hover:bg-black/6">
              <img src="/icons/upload.svg" alt="upload-svg" className="h-5 w-5" />

            </span>

            <span className="text-sm font-medium">
              Upload a CSV file
            </span>
            <span className="mt-3 text-[10px] font-bold uppercase tracking-wider text-[#d32323]">
              CSV · Max 5 MB
            </span>
            <input
              ref={inputRef}
              type="file"
              name="csv-data"
              id="csv-data"
              accept=".csv,text/csv"
              onChange={(event) => {
                handleInputChange(
                  event, setCSVData, setNotice, setIsTableOpen
                )
              }}
              className="sr-only"
            />
          </label>
        ) : (
          <div className="rounded-xl border border-black/10 p-3">
            <div className="flex items-start gap-3">

              <div className="min-w-0 flex-1">
                <p className="mt-1 text-xs text-black/45">
                  Total: {rowCount} {rowCount > 1 ? "rows" : "row"} and {csvData.headers.length} {csvData.headers.length > 1 ? "columns" : "comumn"}
                </p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsTableOpen(true)}
                className="rounded-lg border border-black/15 bg-white px-3 py-2 text-xs font-medium text-black transition-colors hover:bg-[#d8d8d8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
              >
                View
              </button>

              <button
                type="button"
                onClick={() => (handleDelete(
                  setCSVData,
                  setNotice,
                  setIsTableOpen,
                  inputRef
                ))}
                className="rounded-lg border border-black/15 px-3 py-2 text-xs font-medium text-black/70 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        )}

        {/* Success, warning and error messages */}
        {notice && notice.type != "success" && (
          <div
            role={"alert"}
            className="flex items- justify-center gap-2 rounded-lg border p-3 text-xs leading-5 border-red-200 bg-red-50 text-red-700"
          >
            <p className="min-w-0 wrap-break-words">{notice.message}</p>
          </div>
        )}
      </div>

      {/* Column list */}
      <div className="border-t border-black/10 px-4 py-4">
        <h3 className="mb-3 text-xs font-semibold text-black/70">
          All Columns
        </h3>

        {!csvData?.ok ? (
          <div className="rounded-lg border border-black/10 bg-black/2 px-3 py-4 text-center">
            <p className="text-xs font-medium text-black/60">
              No columns yet
            </p>
            <p className="mt-1 text-[11px] leading-5 text-black/40">
              Upload a CSV to see its column names here.
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {csvData.headers.map((header) => (
              <span
                key={header}
                title={header}
                className="max-w-full truncate rounded-md border border-black/10 bg-white px-2.5 py-1.5 text-xs font-medium text-black/75 transition-colors hover:border-black/30 hover:bg-black/3"
              >
                {header}
              </span>
            ))}
          </div>
        )}
      </div>

      {isTableOpen && csvData?.ok && (
        <Table
          csvData={csvData}
          rowCount={rowCount}
          onCellChange={(header, rowIndex, value) =>
            handleCellChange(header, rowIndex, value, setCSVData)
          }
          onClose={() => setIsTableOpen(false)}
        />
      )}
    </aside>
  );
}