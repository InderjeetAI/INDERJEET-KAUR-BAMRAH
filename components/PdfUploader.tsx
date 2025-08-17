
import React, { useState, useCallback } from 'react';
import { UploadCloudIcon, FileTextIcon, CheckCircleIcon } from './Icons';

interface PdfUploaderProps {
  onFileSelect: (file: File) => void;
}

const sensitiveDataTypes = [
  "Personal Names", "ORGANISATION Names", "Locations & Addresses", "Emails & Phone Numbers", "GSTIN, PAN, TAN",
  "Aadhaar Numbers", "Bank Accounts & IFSC", "Case & Notice IDs"
];

export const PdfUploader: React.FC<PdfUploaderProps> = ({ onFileSelect }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      if (e.dataTransfer.files[0].type === "application/pdf") {
        onFileSelect(e.dataTransfer.files[0]);
      }
    }
  }, [onFileSelect]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-4">
      <div 
        className={`w-full max-w-3xl border-2 border-dashed rounded-xl transition-all duration-300 ${isDragging ? 'border-cyan-400 bg-gray-700/50 scale-105' : 'border-gray-600 bg-gray-800/20'}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="p-8 sm:p-12">
          <div className="flex justify-center mb-6">
            <UploadCloudIcon className="w-16 h-16 text-gray-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Upload your PDF</h2>
          <p className="text-gray-400 mb-6">Drag & drop a file here or click to select a file</p>
          <input 
            type="file" 
            id="pdf-upload" 
            className="hidden" 
            accept="application/pdf"
            onChange={handleFileChange}
          />
          <label htmlFor="pdf-upload" className="cursor-pointer inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-gray-900">
            <FileTextIcon className="w-5 h-5 mr-2" />
            Select PDF
          </label>
        </div>
      </div>
      <div className="mt-8 max-w-3xl w-full">
          <h3 className="text-lg font-semibold text-gray-300 mb-4">Automatically Detects and Redacts:</h3>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 text-left">
              {sensitiveDataTypes.map((type, index) => (
                  <div key={index} className="flex items-start">
                      <CheckCircleIcon className="w-5 h-5 text-green-400 mr-2 mt-1 flex-shrink-0" />
                      <span className="text-gray-400 text-sm">{type}</span>
                  </div>
              ))}
          </div>
           <p className="text-xs text-gray-500 mt-6 italic">Your files are processed locally in your browser and are never uploaded. Redactions permanently destroy the original text to ensure it is unrecoverable.</p>
      </div>
    </div>
  );
};