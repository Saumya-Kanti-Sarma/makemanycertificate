import React, { useRef } from "react";
import { GoUpload } from "react-icons/go";
import { CertificateInterface } from "@/types/types";

interface EnterCertificateProps {
  onCertificateChange: (cert: CertificateInterface) => void;
}

export default function EnterCertificate({ onCertificateChange }: EnterCertificateProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileUrl = URL.createObjectURL(file);
    const cert: CertificateInterface = {
      name: file.name,
      size: file.size,
      type: file.type,
      url: fileUrl,
    };

    onCertificateChange(cert);
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Hidden native input */}
        <input
          ref={inputRef}
          type="file"
          name="certificate"
          id="certificate"
          accept="image/jpeg, image/png"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Clickable drop zone */}
        <label
          htmlFor="certificate"
          className="group flex cursor-pointer flex-col items-center justify-center gap-3
                     rounded-xl border-2 border-dashed border-gray-300 bg-white px-6 py-12
                     text-center transition-colors
                     hover:border-gray-400 hover:bg-gray-50"
        >
          <GoUpload className="h-10 w-10 text-gray-400 transition-colors group-hover:text-gray-500" />

          <div>
            <p className="text-sm font-medium text-gray-700">Click to upload your certificate</p>
            <p className="mt-1 text-xs text-[#c91111]">PNG or JPG </p>
          </div>
        </label>
      </div>
    </div>
  );
}