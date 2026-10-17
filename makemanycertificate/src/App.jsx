// Certificate generator — runs fully in the browser.
// Setup:  npm install jszip
// Usage:  drop this file in src/App.jsx of a Vite / CRA project.

import { useEffect, useRef, useState } from "react";
import JSZip from "jszip";

/* ---------- helpers ---------- */

// Small CSV parser (handles quotes, commas inside quotes, CRLF, BOM)
function parseCSV(text) {
  text = text.replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        cell += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += c;
    }
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }

  const nonEmpty = rows.filter((r) => r.some((v) => v.trim() !== ""));
  if (!nonEmpty.length) return { headers: [], records: [] };

  const headers = nonEmpty[0].map((h) => h.trim());
  const records = nonEmpty.slice(1).map((r) => {
    const obj = {};
    headers.forEach((h, i) => (obj[h] = (r[i] ?? "").trim()));
    return obj;
  });
  return { headers, records };
}

const safeName = (s) => String(s || "certificate").replace(/[^\w\- ]+/g, "").trim().slice(0, 60) || "certificate";

const fontString = (f, size) =>
  `${f.bold ? "bold " : ""}${size}px ${f.font}`;

// Draw one certificate (used for both preview and final export)
function drawCertificate(ctx, img, fields, record) {
  const W = img.naturalWidth;
  const H = img.naturalHeight;
  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(img, 0, 0, W, H);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  fields.forEach((f) => {
    ctx.font = fontString(f, f.size);
    ctx.fillStyle = f.color;
    ctx.fillText(record?.[f.column] ?? "", f.x * W, f.y * H);
  });
}

const FONTS = ["Georgia", "Times New Roman", "Arial", "Verdana", "Courier New"];

/* ---------- component ---------- */

export default function App() {
  const [img, setImg] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [records, setRecords] = useState([]);
  const [fields, setFields] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [nameColumn, setNameColumn] = useState("");
  const [progress, setProgress] = useState(null); // { done, total }
  const [zipUrl, setZipUrl] = useState(null);
  const [error, setError] = useState("");

  const canvasRef = useRef(null);
  const dragRef = useRef(null);

  const selected = fields.find((f) => f.id === selectedId);
  const busy = progress !== null;

  /* --- uploads --- */

  const onImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      setImg(image);
      setFields([]);
      setSelectedId(null);
      setZipUrl(null);
    };
    image.onerror = () => setError("Could not read that image.");
    image.src = url;
  };

  const onCSV = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { headers, records } = parseCSV(await file.text());
    if (!headers.length || !records.length) {
      setError("The CSV needs a header row and at least one data row.");
      return;
    }
    setError("");
    setHeaders(headers);
    setRecords(records);
    setNameColumn(headers[0]);
    setPreviewIndex(0);
    setFields([]);
    setSelectedId(null);
    setZipUrl(null);
  };

  /* --- fields --- */

  const addField = (column) => {
    if (!img) return;
    const id = crypto.randomUUID();
    setFields((fs) => [
      ...fs,
      {
        id,
        column,
        x: 0.5,
        y: 0.5,
        size: Math.round(img.naturalHeight / 18),
        color: "#1a1a1a",
        font: "Georgia",
        bold: false,
      },
    ]);
    setSelectedId(id);
  };

  const updateField = (id, patch) =>
    setFields((fs) => fs.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  const removeField = (id) => {
    setFields((fs) => fs.filter((f) => f.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  /* --- preview drawing --- */

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!img || !canvas) return;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    drawCertificate(ctx, img, fields, records[previewIndex]);

    // selection box (preview only)
    if (selected) {
      ctx.font = fontString(selected, selected.size);
      const text = records[previewIndex]?.[selected.column] ?? "";
      const w = Math.max(ctx.measureText(text).width, selected.size);
      ctx.strokeStyle = "#2563eb";
      ctx.lineWidth = Math.max(2, img.naturalWidth / 500);
      ctx.setLineDash([10, 6]);
      ctx.strokeRect(
        selected.x * img.naturalWidth - w / 2 - 8,
        selected.y * img.naturalHeight - selected.size / 2 - 8,
        w + 16,
        selected.size + 16
      );
      ctx.setLineDash([]);
    }
  }, [img, fields, records, previewIndex, selected]);

  /* --- dragging text on the canvas --- */

  const toCanvasPoint = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) * canvas.width) / rect.width,
      y: ((e.clientY - rect.top) * canvas.height) / rect.height,
    };
  };

  const onPointerDown = (e) => {
    if (!img) return;
    const p = toCanvasPoint(e);
    const ctx = canvasRef.current.getContext("2d");
    // top-most field first
    for (let i = fields.length - 1; i >= 0; i--) {
      const f = fields[i];
      ctx.font = fontString(f, f.size);
      const text = records[previewIndex]?.[f.column] ?? "";
      const w = Math.max(ctx.measureText(text).width, f.size);
      const cx = f.x * img.naturalWidth;
      const cy = f.y * img.naturalHeight;
      if (Math.abs(p.x - cx) <= w / 2 + 8 && Math.abs(p.y - cy) <= f.size / 2 + 8) {
        setSelectedId(f.id);
        dragRef.current = { id: f.id, dx: p.x - cx, dy: p.y - cy };
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }
    }
    setSelectedId(null);
  };

  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    const p = toCanvasPoint(e);
    const x = Math.min(1, Math.max(0, (p.x - d.dx) / img.naturalWidth));
    const y = Math.min(1, Math.max(0, (p.y - d.dy) / img.naturalHeight));
    updateField(d.id, { x, y });
  };

  const onPointerUp = () => (dragRef.current = null);

  /* --- generate zip --- */

  const generate = async () => {
    if (!img || !fields.length || !records.length) return;
    setError("");
    if (zipUrl) URL.revokeObjectURL(zipUrl);
    setZipUrl(null);
    setProgress({ done: 0, total: records.length });

    try {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      const zip = new JSZip();

      for (let i = 0; i < records.length; i++) {
        drawCertificate(ctx, img, fields, records[i]);
        const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));
        const label = safeName(records[i][nameColumn]);
        zip.file(`${String(i + 1).padStart(3, "0")}_${label}.png`, blob);
        setProgress({ done: i + 1, total: records.length });
        await new Promise((r) => setTimeout(r, 0)); // let the UI update
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      setZipUrl(URL.createObjectURL(zipBlob));
    } catch (err) {
      setError("Something went wrong while generating: " + err.message);
    } finally {
      setProgress(null);
    }
  };

  /* --- UI --- */

  return (
    <div className="app">
      <style>{css}</style>

      <aside className="panel">
        <h1>Certificate generator</h1>

        <section>
          <h2>1. Certificate image</h2>
          <input type="file" accept="image/*" onChange={onImage} />
        </section>

        <section>
          <h2>2. Data (CSV)</h2>
          <input type="file" accept=".csv,text/csv" onChange={onCSV} />
          {records.length > 0 && (
            <p className="hint">
              {records.length} rows · {headers.length} columns
            </p>
          )}
        </section>

        <section>
          <h2>3. Place text</h2>
          {!headers.length || !img ? (
            <p className="hint">Upload an image and a CSV first.</p>
          ) : (
            <>
              <p className="hint">Click a column to add it, then drag it on the certificate.</p>
              <div className="chips">
                {headers.map((h) => (
                  <button key={h} className="chip" onClick={() => addField(h)}>
                    + {h}
                  </button>
                ))}
              </div>
            </>
          )}

          {fields.length > 0 && (
            <ul className="fieldList">
              {fields.map((f) => (
                <li
                  key={f.id}
                  className={f.id === selectedId ? "active" : ""}
                  onClick={() => setSelectedId(f.id)}
                >
                  <span>{f.column}</span>
                  <button
                    className="link"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeField(f.id);
                    }}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}

          {selected && (
            <div className="controls">
              <label>
                Font
                <select
                  value={selected.font}
                  onChange={(e) => updateField(selected.id, { font: e.target.value })}
                >
                  {FONTS.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
              </label>
              <label>
                Size ({selected.size}px)
                <input
                  type="range"
                  min="10"
                  max={Math.round(img.naturalHeight / 4)}
                  value={selected.size}
                  onChange={(e) => updateField(selected.id, { size: +e.target.value })}
                />
              </label>
              <label className="row">
                Color
                <input
                  type="color"
                  value={selected.color}
                  onChange={(e) => updateField(selected.id, { color: e.target.value })}
                />
              </label>
              <label className="row">
                Bold
                <input
                  type="checkbox"
                  checked={selected.bold}
                  onChange={(e) => updateField(selected.id, { bold: e.target.checked })}
                />
              </label>
            </div>
          )}
        </section>

        <section>
          <h2>4. Generate</h2>
          {headers.length > 0 && (
            <label>
              Name files using
              <select value={nameColumn} onChange={(e) => setNameColumn(e.target.value)}>
                {headers.map((h) => (
                  <option key={h}>{h}</option>
                ))}
              </select>
            </label>
          )}
          <button
            className="primary"
            onClick={generate}
            disabled={busy || !img || !fields.length || !records.length}
          >
            {busy
              ? `Generating ${progress.done} / ${progress.total}…`
              : `Generate ${records.length || ""} certificates`}
          </button>

          {zipUrl && (
            <a className="primary download" href={zipUrl} download="certificates.zip">
              Download certificates.zip
            </a>
          )}
          {error && <p className="error">{error}</p>}
        </section>
      </aside>

      <main className="stage">
        {!img ? (
          <div className="empty">Upload a certificate image to start.</div>
        ) : (
          <>
            {records.length > 1 && (
              <div className="previewBar">
                Previewing row
                <input
                  type="number"
                  min="1"
                  max={records.length}
                  value={previewIndex + 1}
                  onChange={(e) =>
                    setPreviewIndex(
                      Math.min(records.length - 1, Math.max(0, (+e.target.value || 1) - 1))
                    )
                  }
                />
                of {records.length}
              </div>
            )}
            <canvas
              ref={canvasRef}
              className="canvas"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
            />
          </>
        )}
      </main>
    </div>
  );
}

/* ---------- styles ---------- */

const css = `
* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, sans-serif; color: #1f2430; background: #eef0f4; }
.app { display: grid; grid-template-columns: 320px 1fr; min-height: 100vh; }
.panel { background: #fff; padding: 20px; border-right: 1px solid #d9dce3; overflow-y: auto; max-height: 100vh; }
.panel h1 { font-size: 20px; margin: 0 0 16px; }
.panel h2 { font-size: 14px; margin: 0 0 8px; }
.panel section { margin-bottom: 22px; display: flex; flex-direction: column; gap: 8px; }
.hint { font-size: 13px; color: #5d6575; margin: 0; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { border: 1px solid #b9c0cf; background: #f6f8fc; border-radius: 999px; padding: 5px 12px; cursor: pointer; font-size: 13px; }
.chip:hover { background: #e7ecf8; }
.fieldList { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 4px; }
.fieldList li { display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; border: 1px solid #d9dce3; border-radius: 6px; cursor: pointer; font-size: 14px; }
.fieldList li.active { border-color: #2563eb; background: #eff4ff; }
.link { background: none; border: none; color: #b42318; cursor: pointer; font-size: 13px; }
.controls { display: flex; flex-direction: column; gap: 10px; padding: 12px; background: #f6f8fc; border-radius: 8px; }
.controls label, .panel label { display: flex; flex-direction: column; gap: 4px; font-size: 13px; }
label.row { flex-direction: row; align-items: center; justify-content: space-between; }
select, input[type=number] { padding: 6px; border: 1px solid #b9c0cf; border-radius: 6px; font-size: 14px; }
.primary { padding: 11px 14px; border-radius: 8px; border: none; background: #2563eb; color: #fff; font-size: 15px; cursor: pointer; text-align: center; text-decoration: none; }
.primary:disabled { background: #a9b5cf; cursor: not-allowed; }
.download { background: #15803d; }
.error { color: #b42318; font-size: 13px; margin: 0; }
.stage { padding: 24px; overflow: auto; max-height: 100vh; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.canvas { max-width: 100%; height: auto; background: #fff; box-shadow: 0 2px 12px rgba(0,0,0,.15); touch-action: none; cursor: move; }
.previewBar { display: flex; align-items: center; gap: 8px; font-size: 14px; }
.previewBar input { width: 70px; }
.empty { margin: auto; color: #5d6575; font-size: 16px; }
@media (max-width: 800px) {
  .app { grid-template-columns: 1fr; }
  .panel { max-height: none; border-right: none; border-bottom: 1px solid #d9dce3; }
}
`;