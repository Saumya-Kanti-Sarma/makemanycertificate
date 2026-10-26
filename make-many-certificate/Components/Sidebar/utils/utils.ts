import { ChangeEvent, RefObject, SetStateAction } from "react";
import { CsvResult, Notice } from "@/types/types";
import { MAX_FILE_SIZE } from "../constants";
import Papa from "papaparse"; // the parses that parses csv into objects.

export const handleCellChange = (header: string, rowIndex: number, value: string, setCSVData: (value: SetStateAction<CsvResult | null>) => void) => {
  setCSVData((current) => {
    if (!current?.ok) return current;

    return {
      ...current,
      rows: {
        ...current.rows,
        [header]: (current.rows[header] ?? []).map((cell, index) =>
          index === rowIndex ? value : cell
        ),
      },
    };
  });
};

export const handleDelete = (
  setCSVData: (value: SetStateAction<CsvResult | null>) => void,
  setNotice: (value: SetStateAction<Notice | null>) => void,
  setIsTableOpen: (value: SetStateAction<boolean>) => void,
  inputRef: RefObject<HTMLInputElement | null>
) => {
  setCSVData(null);
  setNotice(null);
  setIsTableOpen(false);

  if (inputRef.current) {
    inputRef.current.value = "";
  }
};

export const handleInputChange = (
  event: ChangeEvent<HTMLInputElement>,
  setCSVData: (value: SetStateAction<CsvResult | null>) => void,
  setNotice: (value: SetStateAction<Notice | null>) => void,
  setIsTableOpen: (value: SetStateAction<boolean>) => void,
) => {
  const file = event.target.files?.[0];
  console.log(event.target.files?.[0])
  if (!file) return;

  // Allow selecting the same file again.
  event.target.value = "";

  const _fail = (message: string) => {
    setCSVData(null);
    setIsTableOpen(false);
    setNotice({ type: "error", message });
  };

  if (file.type != "text/csv") return _fail("Invalid file format. Please select a .csv file.");
  if (file.size === 0) return _fail("This file is empty. Select a CSV containing data.");
  if (file.size > MAX_FILE_SIZE) return _fail("File is too large. The maximum allowed size is 5 MB.");

  setNotice(null);
  setCSVData(null);

  Papa.parse<Record<string, string>>(file, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim(),

    complete: (results) => {
      const headers = results.meta.fields ?? [];

      if (headers.length === 0 || headers.every((h) => !h)) {
        setCSVData(null);
        setNotice({
          type: "error",
          message:
            "No column headers found. Add a header row and try again.",
        });
        return;
      }

      const normalizedHeaders = headers.map((header) => header.trim());

      if (new Set(normalizedHeaders).size !== normalizedHeaders.length) {
        setCSVData(null);
        setNotice({
          type: "error",
          message:
            "Duplicate column names were found. Rename them and upload again.",
        });
        return;
      }

      const rows = Object.fromEntries(
        normalizedHeaders.map((header) => [
          header,
          results.data.map((row) => row[header] ?? ""),
        ])
      );

      if (results.data.length === 0) {
        setCSVData(null);
        setNotice({
          type: "error",
          message:
            "The CSV has headers but no data rows. Add data and try again.",
        });
        return;
      }

      setCSVData({
        ok: true,
        headers: normalizedHeaders,
        rows,
        filename: file.name
      });

    },

    error: () => {
      _fail("Unable to read this file. Please try another CSV.");
    },
  });
};


export function uid() {
  return Math.random().toString(36).slice(2);
}