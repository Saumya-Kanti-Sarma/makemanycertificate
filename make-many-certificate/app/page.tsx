"use client";
import EnterCertificate from "@/Components/EnterCertificate/EnterCertificate";
import Navbar from "@/Components/Navbar/Navbar";
import React, { useState } from "react";
import { CertificateInterface } from "@/types/types";
import Sidebar from "@/Components/Sidebar/Sidebar";


export default function GenerateCertificate() {
  const [certificate, setCertificate] = useState<CertificateInterface | null>(null);


  const handleCertificateChange = (cert: CertificateInterface) => {
    setCertificate(cert);
  };

  // if (certificate == null) return <EnterCertificate onCertificateChange={handleCertificateChange} />

  return (
    <>
      <Navbar />
      <main className="flex bg-red-400 h-(--body-height)">
        <Sidebar />
        <div>
          hrllo
        </div>

      </main>
    </>
  );
}