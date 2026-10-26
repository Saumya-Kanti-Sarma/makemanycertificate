/* 
For Future Saumya:
This is the 1st screen that is visible on the website launch. 
When a user selects an image (jpg or png) then ths component becomes invisible and the <CertificateEditor/> component take in action. 
*/
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
    <div className="flex flex-col min-h-[calc(100vh-4rem)] items-center justify-center px-4">

      <img
        src="/multy-certy/black-logo.svg"
        alt="multy-certy logo"
        className="mb-8 h-26 w-auto"
      />

      <h1 className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
        <span>Welcome to</span>
        <img src="/cursive.svg" alt="Make Many" className="h-10 w-auto sm:h-12" />
      </h1>

      <p className="mt-4 mb-5 max-w-lg text-center text-base leading-relaxed text-(--text-gray) sm:text-lg">
        Generate certificates, report cards, IDs, and more in bulk for <b>FREE!</b>
      </p>
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
            <p className="text-sm font-medium text-(--text-gray)">Click to upload your certificate</p>
            <p className="mt-1 text-xs text-(--text-gray)"> <b>PNG or JPG</b> </p>
          </div>
        </label>
      </div>
    </div>
  );
}