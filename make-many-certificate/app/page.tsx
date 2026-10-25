"use client";
import EnterCertificate from "@/Components/EnterCertificate/EnterCertificate";
import Navbar from "@/Components/Navbar/Navbar";
import React, { useRef, useState } from "react";
import { CertificateInterface } from "@/types/types";
import Sidebar, { type TextField } from "@/Components/Sidebar/Sidebar";
import CertificateEditor from "@/Components/CertificateEditor/CertificateEditor";
import type { CsvResult } from "@/Components/Sidebar/types";


export default function GenerateCertificate() {
  const [certificate, setCertificate] = useState<CertificateInterface | null>(null);
  const [csvData, setCsvData] = useState<CsvResult | null>(null);
  const [fields, setFields] = useState<TextField[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  if (certificate == null)
    return <EnterCertificate onCertificateChange={setCertificate} />;

  function handleMoveField(id: string, x: number, y: number) {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, x, y } : f)));
  }

  return (
    <>
      <Navbar />
      <main className="flex h-(--body-height) overflow-hidden">
        <Sidebar
          certificate={certificate}
          onFieldsChange={setFields}
          onCsvDataChange={setCsvData}
          imgRef={imgRef}
        />
        <CertificateEditor
          certificate={certificate}
          csvData={csvData}
          fields={fields}
          selectedId={selectedId}
          imgRef={imgRef}
          onSelectField={setSelectedId}
          onMoveField={handleMoveField}
        />
      </main>
    </>
  );
}
