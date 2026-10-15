import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

export default function DocumentUpload({ onExtractionSuccess }) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [reviewNotice, setReviewNotice] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    setReviewNotice(null);
    setUploadedFile(file.name);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        throw new Error('Document processing failed');
      }

      const result = await res.json();
      const { extractedData, matchedOffenses, unmatchedSections, requiresManualReview } = result;

      if (requiresManualReview) {
        setReviewNotice({
          missingFields: extractedData?.missingFields || [],
          unmatchedSections: unmatchedSections || []
        });
      }

      if (onExtractionSuccess) {
        onExtractionSuccess({
          extractedData,
          matchedOffenses,
          requiresManualReview
        });
      }
    } catch (err) {
      setReviewNotice({
        error: err.message || 'Failed to parse document'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">Document Ingestion Pipeline</h2>
          <p className="text-xs text-slate-500">Upload FIR, Remand Sheet, or Bail Order (PDF or TXT)</p>
        </div>
        <div className="p-2 bg-indigo-50 rounded-lg">
          <UploadCloud className="w-5 h-5 text-indigo-600" />
        </div>
      </div>

      <div
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
          dragOver ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.txt,application/pdf,text/plain"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileUpload(e.target.files[0]);
            }
          }}
        />

        {uploading ? (
          <div className="flex flex-col items-center justify-center space-y-2 py-4">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-sm font-semibold text-slate-800">Parsing and extracting legal fields...</p>
            <p className="text-xs text-slate-400">Linking offenses to statutory database</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-2 py-2">
            <div className="p-3 bg-white rounded-full shadow-sm border border-slate-200 text-indigo-600">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">
                {uploadedFile ? uploadedFile : 'Drop legal document here or click to browse'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Scanned FIRs, remand sheets, chargesheets up to 15MB</p>
            </div>
          </div>
        )}
      </div>

      {reviewNotice && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-amber-950">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>Manual Review Required</span>
          </div>
          {reviewNotice.missingFields?.length > 0 && (
            <p>
              The following required fields could not be extracted with certainty:{' '}
              <span className="font-semibold">{reviewNotice.missingFields.join(', ')}</span>. Please verify and fill in the form.
            </p>
          )}
          {reviewNotice.unmatchedSections?.length > 0 && (
            <p>
              Unrecognized statutory section(s):{' '}
              <span className="font-semibold">{reviewNotice.unmatchedSections.join(', ')}</span>.
            </p>
          )}
          {reviewNotice.error && <p>{reviewNotice.error}</p>}
        </div>
      )}
    </div>
  );
}
