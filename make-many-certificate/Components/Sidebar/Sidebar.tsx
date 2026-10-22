import { useRef, useState } from "react";
import Papa from "papaparse";

interface SideBarInterface {
  handleChange?: () => void;
}

type CsvResult =
  | { ok: true; headers: string[]; rows: Record<string, string[]> }
  | { ok: false; error: Error };

export default function Sidebar({ handleChange }: SideBarInterface) {
  const _inputRef = useRef<HTMLInputElement>(null);
  const [csvData, setCSVData] = useState<CsvResult | null>(null);

  const _handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields ?? [];
        const rows = Object.fromEntries(
          headers.map((col) => [col, results.data.map((row) => row[col])])
        );
        setCSVData({ ok: true, headers, rows });
        handleChange?.();
      },
      error: (err) => setCSVData({ ok: false, error: err }),
    });

    // allow re-selecting the same file
    event.target.value = "";
  };

  return (
    <aside className="flex w-64 shrink-0 flex-col gap-4 border-r border-amber-300 bg-amber-50 p-4">
      <header className="flex items-start justify-start">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-900">
          CSV Data
        </h2>
        {csvData?.ok && (
          <span className="px-2 py-0.5 text-xs font-medium ">
            {csvData.headers.length} cols
          </span>
        )}
      </header>

      {/* Upload button - Added grapy hover state */}
      <label
        htmlFor="csv-data"
        className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed  bg-white px-3 py-2 text-sm font-medium text-black transition-colors duration-200 opacity-50 hover:opacity-100 "
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M12 16V4m0 0L8 8m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
        </svg>
        Upload CSV
      </label>
      <input
        type="file"
        name="csv-data"
        id="csv-data"
        accept=".csv,text/csv"
        ref={_inputRef}
        onChange={_handleInputChange}
        className="sr-only"
      />
      {/* Error state */}
      {csvData && !csvData.ok && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-200">
          {csvData.error.message}
        </p>
      )}

      {/* Empty state */}
      {!csvData && (
        <p className="text-xs text-amber-700/70">
          No file loaded yet. Choose a CSV to see its columns.
        </p>
      )}

      {/* Column list - Added grapy hover state */}
      {csvData?.ok && (
        <div className="flex flex-wrap gap-1.5">
          {csvData.headers.map((header) => (
            <button
              key={header}
              className="inline-flex cursor-pointer items-center rounded-[10px] border border-gray-200 bg-white px-3 py-1 text-sm font-medium text-gray-800 transition-colors duration-200 opacity-50 hover:opacity-100 focus:outline-none "
            >
              {header}
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}