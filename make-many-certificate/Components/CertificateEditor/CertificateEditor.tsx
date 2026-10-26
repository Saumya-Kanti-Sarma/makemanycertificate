"use client";
import React, { useCallback, useEffect, useRef } from "react";
import { CertificateInterface } from "@/types/types";
import { CsvResult } from "@/Components/Sidebar/types";
import type { TextField } from "@/Components/Sidebar/Sidebar";

interface Props {
  certificate: CertificateInterface;
  csvData: CsvResult | null;
  fields: TextField[];
  selectedId: string | null;
  imgRef: React.RefObject<HTMLImageElement | null>;
  onSelectField: (id: string | null) => void;
  onMoveField: (id: string, x: number, y: number) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function drawFields(
  ctx: CanvasRenderingContext2D,
  fields: TextField[],
  rowValues: Record<string, string>,
  w: number,
  h: number
) {
  for (const field of fields) {
    const text = rowValues[field.column] ?? "";
    const weight = field.bold ? "bold" : "normal";
    const style = field.italic ? "italic" : "normal";
    ctx.font = `${style} ${weight} ${field.fontSize}px "${field.fontFamily}"`;
    ctx.fillStyle = field.color;
    ctx.textBaseline = "top";
    ctx.fillText(text, field.x * w, field.y * h);
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CertificateEditor({
  certificate,
  csvData,
  fields,
  selectedId,
  imgRef,
  onSelectField,
  onMoveField,
}: Props) {
  const previewRef = useRef<HTMLCanvasElement>(null);
  const draggingRef = useRef<{ id: string; ox: number; oy: number } | null>(null);

  // ── Redraw canvas ─────────────────────────────────────────────────────────
  const redraw = useCallback(
    (currentFields: TextField[], img: HTMLImageElement | null = imgRef.current) => {
      const canvas = previewRef.current;
      if (!canvas || !img) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);

      // First row values (or column name as fallback) for preview
      const previewValues: Record<string, string> = {};
      if (csvData?.ok) {
        for (const header of csvData.headers) {
          previewValues[header] = csvData.rows[header]?.[0] ?? header;
        }
      } else {
        for (const f of currentFields) {
          previewValues[f.column] = f.column;
        }
      }

      drawFields(ctx, currentFields, previewValues, img.naturalWidth, img.naturalHeight);

      // Selection highlight
      for (const field of currentFields) {
        if (field.id !== selectedId) continue;
        const weight = field.bold ? "bold" : "normal";
        const style = field.italic ? "italic" : "normal";
        ctx.font = `${style} ${weight} ${field.fontSize}px "${field.fontFamily}"`;
        const text = previewValues[field.column] ?? field.column;
        const tw = ctx.measureText(text).width;
        const th = field.fontSize * 1.2;
        const px = field.x * img.naturalWidth;
        const py = field.y * img.naturalHeight;
        ctx.strokeStyle = "#2563eb";
        ctx.lineWidth = 2;
        ctx.strokeRect(px - 2, py - 2, tw + 4, th + 4);
      }
    },
    [csvData, selectedId, imgRef]
  );

  // ── Load image ────────────────────────────────────────────────────────────
  // fieldsRef always holds the latest fields, so the onload callback never
  // draws with an old copy.
  const fieldsRef = useRef(fields);
  fieldsRef.current = fields;

  useEffect(() => {
    const img = new Image();
    img.src = certificate.url;
    img.onload = () => {
      imgRef.current = img;
      redraw(fieldsRef.current, img);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [certificate.url]);

  // Redraw whenever fields, selection or CSV data change
  useEffect(() => {
    redraw(fields);
  }, [fields, selectedId, redraw]);

  // ── Mouse helpers ─────────────────────────────────────────────────────────

  function toNorm(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = previewRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      nx: (e.clientX - rect.left) / rect.width,
      ny: (e.clientY - rect.top) / rect.height,
    };
  }

  function onMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    const { nx, ny } = toNorm(e);
    const img = imgRef.current;
    if (!img) return;

    for (let i = fields.length - 1; i >= 0; i--) {
      const field = fields[i];
      const canvas = previewRef.current!;
      const ctx = canvas.getContext("2d")!;
      const weight = field.bold ? "bold" : "normal";
      const style = field.italic ? "italic" : "normal";
      ctx.font = `${style} ${weight} ${field.fontSize}px "${field.fontFamily}"`;

      const previewVal = csvData?.ok
        ? (csvData.rows[field.column]?.[0] ?? field.column)
        : field.column;
      const tw = ctx.measureText(previewVal).width / img.naturalWidth;
      const th = (field.fontSize * 1.2) / img.naturalHeight;

      if (nx >= field.x && nx <= field.x + tw && ny >= field.y && ny <= field.y + th) {
        onSelectField(field.id);
        draggingRef.current = { id: field.id, ox: nx - field.x, oy: ny - field.y };
        return;
      }
    }
    onSelectField(null);
  }

  function onMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const d = draggingRef.current;
    if (!d) return;
    const { nx, ny } = toNorm(e);
    onMoveField(
      d.id,
      Math.max(0, Math.min(0.98, nx - d.ox)),
      Math.max(0, Math.min(0.98, ny - d.oy))
    );
  }

  function onMouseUp() {
    draggingRef.current = null;
  }

  return (
    <div className="relative flex flex-1 items-center justify-center overflow-auto bg-gray-100 p-6 ">
      <div>
        <button
          onClick={() => window.location.reload()}
          className="absolute left-0 top-0 bg-white m-1 p-2 rounded-sm cursor-pointer text-(--text-gray) transition-all duration-100 ease-in hover:scale-105 hover:text-black"
        >
          Re-select
        </button>
      </div>
      <canvas
        ref={previewRef}
        className="max-h-full max-w-full cursor-crosshair shadow-xl"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      />
    </div>
  );
}