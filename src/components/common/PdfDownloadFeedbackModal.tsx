import React from 'react';
import { CheckCircle2, Download, Share2, X, FileText, AlertCircle, ExternalLink } from 'lucide-react';
import { sharePdfFile } from '../../lib/pdfGenerator';

interface PdfDownloadFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  filename: string;
  location: string;
  blob: Blob | null;
  canShare: boolean;
  title?: string;
}

export const PdfDownloadFeedbackModal: React.FC<PdfDownloadFeedbackModalProps> = ({
  isOpen,
  onClose,
  filename,
  location,
  blob,
  canShare,
  title = 'Hamza Computerized Kanta Slip',
}) => {
  if (!isOpen) return null;

  const handleShare = async () => {
    if (!blob) return;
    await sharePdfFile(blob, filename, title);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base">
                PDF Downloaded Successfully!
              </h3>
              <p className="text-xs text-slate-500">
                File is ready on your Android phone
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* File info card */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
            <div className="overflow-hidden">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Saved File Name
              </span>
              <span className="font-mono font-bold text-xs text-slate-900 truncate block">
                {filename}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 text-xs text-slate-600">
            <span className="font-bold text-slate-700 block mb-0.5">Where to find it:</span>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Saved directly to your mobile phone's <strong>{location}</strong>. You can open it anytime using your phone's <strong>Files / File Manager</strong> or PDF viewer.
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
          {blob && (
            <>
              <button
                onClick={handleShare}
                className="w-full sm:flex-1 py-3 px-4 bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white font-bold rounded-xl shadow-md transition cursor-pointer text-xs flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                <span>Share / Open App</span>
              </button>
              <button
                onClick={() => {
                  const url = URL.createObjectURL(blob);
                  window.open(url, '_blank');
                }}
                className="w-full sm:w-auto py-3 px-3.5 border border-blue-300 text-blue-700 hover:bg-blue-50 font-bold rounded-xl transition cursor-pointer text-xs flex items-center justify-center gap-1.5"
                title="View PDF"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>View</span>
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="w-full sm:w-auto py-3 px-5 border border-slate-300 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer text-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
