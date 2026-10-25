
export type CsvResult =
  | { ok: true; headers: string[]; rows: Record<string, string[]>, filename: string }
  | { ok: false; error: Error };

export type Notice = {
  type: "success" | "error";
  message: string;
};
