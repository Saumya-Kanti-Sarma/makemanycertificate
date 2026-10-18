"use client";

import Navbar from "@/Components/Navbar/Navbar";
import { useRef, useState } from "react";

export default function Page() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);

  const handleFile = (selectedFile?: File) => {
    if (!selectedFile) return;

    const allowedTypes = ["image/jpeg", "image/png"];
    if (!allowedTypes.includes(selectedFile.type)) {
      alert("Please select JPG or PNG image");
      return;
    }

    setFile(selectedFile);
  };

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-(--background) text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(233,29,29,0.09),transparent_50%)]" />
      <Navbar />

      <section className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-5 py-16 sm:px-8">
        <div className="mb-5 flex items-center gap-3 text-[10px] font-bold tracking-[0.3em] text-zinc-400">
          <span className="h-px w-6 bg-[#e91d1d]" />
          YOUR WORKSPACE
        </div>

        <h1 className="text-center text-4xl font-bold leading-[1.12] tracking-[-0.06em] sm:text-6xl">
          Bring your
          <br />
          documents <span className="text-[#e91d1d]">to life.</span>
        </h1>

        <p className="mt-5 max-w-md text-center text-sm leading-7 text-zinc-400">
          Upload your document to get started. Simple, fast,
          and designed to keep your workflow effortless.
        </p>

        <div className="mt-9 w-full rounded-2xl border border-white/10 bg-[#131313]/90 p-5 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-7">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">
                Upload a document
              </h2>
              <p className="mt-1.5 text-xs text-zinc-500">
                Choose a file from your device
              </p>
            </div>

            <span className="rounded-lg border border-white/10 px-3 py-2 text-[10px] tracking-widest text-zinc-400">
              01 / 01
            </span>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              handleFile(event.dataTransfer.files[0]);
            }}
            className={`group flex min-h-[230px] w-full flex-col items-center justify-center rounded-xl border border-dashed px-4 py-8 transition ${file
              ? "border-emerald-500/60 bg-emerald-500/[0.03]"
              : "border-zinc-700 bg-white/[0.01] hover:border-[#e91d1d] hover:bg-red-500/[0.03]"
              }`}
          >
            <div className={`mb-5 grid h-13 w-13 place-items-center rounded-2xl p-3 ${file
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-red-500/10 text-red-400"
              }`}>
              {file ? (
                <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
                  <path d="m5 12.5 4.5 4.5L19 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
                  <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>

            <h3 className="max-w-full break-all text-sm font-semibold">
              {file ? file.name : "Drop your file here"}
            </h3>

            <p className="mt-2 text-xs text-zinc-500">
              {file
                ? `${(file.size / 1024 / 1024).toFixed(2)} MB · Ready to upload`
                : "or click to browse your computer"}
            </p>

            <span className="mt-5 rounded-lg border border-red-500/40 bg-red-500/[0.08] px-4 py-2.5 text-xs font-semibold text-red-400 transition group-hover:bg-red-500/15">
              {file ? "Choose another file" : "Browse files"}
            </span>

            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              className="hidden"
              onChange={(event) => handleFile(event.target.files?.[0])}
            />
          </button>

          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 text-[11px] text-zinc-400">
            <span>
              <span className="mr-2 text-red-400">↗</span>
              JPG, PNG, PDF
            </span>
            <span>
              <span className="mr-2 text-red-400">◇</span>
              Maximum 10 MB
            </span>
          </div>

          <button
            type="button"
            disabled={!file}
            onClick={() => {
              if (file) console.log("Selected document:", file);
            }}
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-lg bg-[#e91d1d] py-3.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-35"
          >
            Continue <span className="text-lg">→</span>
          </button>
        </div>

        <div className="mt-6 flex items-center gap-2 text-center text-[11px] text-zinc-500">
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0">
            <path d="M12 3 19 6v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Your files stay yours. Upload only when you're ready.
        </div>
      </section>

    </main>
  );
}