import type { CsvResult } from "@/types/types";

interface TableProps {
  csvData: Extract<CsvResult, { ok: true }>;
  rowCount: number;
  onCellChange: (
    header: string,
    rowIndex: number,
    value: string,
    setCSVData?: () => void
  ) => void;
  onClose: () => void;
}

const Table = ({ csvData, rowCount, onCellChange, onClose }: TableProps) => {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="csv-table-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-black/10 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
          <div>
            <h2
              id="csv-table-title"
              className="text-base font-semibold tracking-tight"
            >
              CSV table
            </h2>
            <p className="mt-1 text-xs text-black/45">
              {rowCount} rows · {csvData.headers.length} columns
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close CSV table"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 text-lg text-black/60 transition-colors hover:bg-black/5 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
          >
            ×
          </button>
        </div>

        <div className="overflow-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-[#f7f7f7]">
              <tr>
                <th className="w-14 border-b border-r border-black/10 px-3 py-3 text-center text-[11px] font-medium text-black/40">
                  #
                </th>
                {csvData.headers.map((header) => (
                  <th
                    key={header}
                    className="whitespace-nowrap border-b border-r border-black/10 px-3 py-3 text-xs font-semibold text-black/75"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {Array.from({ length: rowCount }).map((_, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="transition-colors hover:bg-black/2"
                >
                  <td className="border-b border-r border-black/6 bg-black/1.5 px-3 py-2 text-center text-xs tabular-nums text-black/40">
                    {rowIndex + 1}
                  </td>

                  {csvData.headers.map((header) => (
                    <td
                      key={header}
                      className="min-w-36 border-b border-r border-black/6 p-1"
                    >
                      <input
                        aria-label={`${header}, row ${rowIndex + 1}`}
                        value={csvData.rows[header]?.[rowIndex] ?? ""}
                        onChange={(event) =>
                          onCellChange(
                            header,
                            rowIndex,
                            event.target.value,

                          )
                        }
                        className="w-full min-w-24 rounded-md border border-transparent bg-transparent px-2 py-1.5 text-xs text-black outline-none transition-colors focus:border-black/20 focus:bg-white focus:ring-2 focus:ring-black/10"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-black/10 px-5 py-3">
          <p className="text-[11px] text-black/45">
            Changes are held in the current session.
          </p>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-black px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default Table;