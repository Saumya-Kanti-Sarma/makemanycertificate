"use client";
import EnterCertificate from "@/Components/EnterCertificate/EnterCertificate";
import Navbar from "@/Components/Navbar/Navbar";
import { useRef, useState } from "react";
import { CertificateInterface } from "@/types/types";
import Sidebar from "@/Components/Sidebar/Sidebar";
import CertificateEditor from "@/Components/CertificateEditor/CertificateEditor";
import type { CsvResult, _type_TextField } from "@/types/types";

export default function GenerateCertificate() {
  const [certificate, setCertificate] = useState<CertificateInterface | null>(null);
  const [csvData, setCsvData] = useState<CsvResult | null>(null);

  // The ONLY place where fields and selectedId live.
  // Sidebar and CertificateEditor both receive them through props.
  const [fields, setFields] = useState<_type_TextField[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const imgRef = useRef<HTMLImageElement | null>(null);

  function handleMoveField(id: string, x: number, y: number) {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, x, y } : f)));
  }

  if (certificate == null)
    return <EnterCertificate onCertificateChange={setCertificate} />;

  return (
    <>
      <Navbar />
      <main className="flex h-(--body-height) overflow-hidden">
        <Sidebar
          certificate={certificate}
          fields={fields}
          setFields={setFields}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          onCsvDataChange={setCsvData}
          imgRef={imgRef}
        />
        <CertificateEditor
          show_prev_next_navigation={csvData ? true : false}
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