import React, { useState } from 'react';
import { Copy, Download, Check, FileCheck, Printer, BookOpen } from 'lucide-react';

export default function PetitionView({ petition }) {
  const [copied, setCopied] = useState(false);

  if (!petition) {
    return null;
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(petition.fullText || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {}
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([petition.fullText || ''], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `Bail_Petition_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">Generated Bail Petition</h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{petition.sectionsInvoked}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {petition.citationsUsed && petition.citationsUsed.length > 0 && (
        <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100">
          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-950 mb-1.5">
            <BookOpen className="w-3.5 h-3.5 text-indigo-700" />
            <span>Injected Supreme Court Precedents:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {petition.citationsUsed.map((citation, i) => (
              <span
                key={i}
                className="inline-block px-2 py-0.5 bg-white border border-indigo-200 text-indigo-900 rounded text-[11px] font-mono shadow-2xs"
              >
                {citation}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="bg-slate-50 rounded-lg border border-slate-200 p-6 font-mono text-xs text-slate-800 leading-relaxed whitespace-pre-wrap max-h-[600px] overflow-y-auto shadow-inner">
        {petition.fullText}
      </div>
    </div>
  );
}
