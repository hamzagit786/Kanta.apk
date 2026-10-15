import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  AlertTriangle, 
  Lock, 
  ArrowDownLeft, 
  ArrowUpRight,
  Download,
  Plus,
  FileText
} from 'lucide-react';
import { PersonalPerson, PersonalLoan, LoanType } from '../../types';
import { useKantaData } from '../../context/KantaDataContext';
import { useAuth } from '../../context/AuthContext';
import { getTodayDateString, formatDate, formatPKR } from '../../lib/formatters';
import { generatePersonalLoanSlipPdf, savePdfToDevice } from '../../lib/pdfGenerator';
import { PdfDownloadFeedbackModal } from '../common/PdfDownloadFeedbackModal';

interface AddLoanModalProps {
  person: PersonalPerson;
  defaultType: LoanType;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddLoanModal: React.FC<AddLoanModalProps> = ({
  person,
  defaultType,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { addPersonalLoan, getLoanRemaining } = useKantaData();
  const { shopName, ownerName } = useAuth();

  const [date, setDate] = useState(getTodayDateString());
  const [type, setType] = useState<LoanType>(defaultType);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Post-save state
  const [savedLoan, setSavedLoan] = useState<PersonalLoan | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfFeedback, setPdfFeedback] = useState<{
    filename: string;
    location: string;
    blob: Blob | null;
    canShare: boolean;
    title?: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setType(defaultType);
      setDate(getTodayDateString());
      setAmount('');
      setNotes('');
      setError(null);
      setSavedLoan(null);
    }
  }, [isOpen, defaultType]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid loan amount greater than 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await addPersonalLoan({
        personId: person.id,
        personName: person.name,
        date,
        type,
        amount: numAmount,
        notes: notes.trim() || undefined,
      });

      // Show post-save screen with Download PDF button below record
      setSavedLoan(created);
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save loan transaction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadPdf = async (loan: PersonalLoan) => {
    if (isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    setError(null);

    try {
      const remaining = getLoanRemaining(loan.id) ?? loan.amount;
      const doc = generatePersonalLoanSlipPdf(
        loan,
        person,
        remaining,
        shopName || 'Hamza Computerized Kanta',
        ownerName || 'Hamza Siddique',
        '03257833708'
      );

      const cleanDate = loan.date || new Date().toISOString().split('T')[0];
      const safeName = person.name.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Record_${cleanDate}_Loan_${safeName}.pdf`;

      const result = await savePdfToDevice(doc, filename, `Loan Voucher - ${person.name}`);
      if (result.success) {
        setPdfFeedback({
          filename: result.filename,
          location: result.location,
          blob: result.blob,
          canShare: result.canShare,
          title: `Loan Voucher - ${person.name}`,
        });
      } else {
        setError(result.error || 'Failed to download PDF.');
      }
    } catch (err) {
      console.error(err);
      setError('Could not generate PDF voucher.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const resetForm = () => {
    setSavedLoan(null);
    setAmount('');
    setNotes('');
    setError(null);
  };

  const handleModalClose = () => {
    onClose();
  };

  const isBorrowed = (savedLoan ? savedLoan.type : type) === 'borrowed';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header styling based on type */}
        <div className={`px-5 py-4 text-white flex items-center justify-between ${
          isBorrowed ? 'bg-amber-600' : 'bg-emerald-600'
        }`}>
          <div className="flex items-center gap-2.5">
            {isBorrowed ? (
              <div className="w-8 h-8 rounded-lg bg-amber-700 flex items-center justify-center">
                <ArrowDownLeft className="w-5 h-5 text-amber-200" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center">
                <ArrowUpRight className="w-5 h-5 text-emerald-200" />
              </div>
            )}
            <div>
              <h3 className="font-bold text-base sm:text-lg">
                {savedLoan
                  ? 'Loan Record Saved'
                  : isBorrowed 
                    ? '+ I Borrowed Money (میں نے ادھار لیا)' 
                    : '+ I Lent Money (میں نے ادھار دیا)'}
              </h3>
              <p className="text-[11px] text-white/80">Account: {person.name}</p>
            </div>
          </div>
          <button
            onClick={handleModalClose}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-black/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* POST-SAVE SCREEN WITH DOWNLOAD PDF BUTTON */}
        {savedLoan ? (
          <div className="p-5 sm:p-6 space-y-4">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h4 className="font-black text-slate-900 text-lg">
                Record Saved Successfully!
              </h4>
              <p className="text-xs text-slate-500">
                Stored in <strong>{person.name}'s</strong> personal udhar khata.
              </p>
            </div>

            {/* Saved Record Details Card */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5 text-xs">
              <div className="flex justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-semibold">Account</span>
                <span className="font-bold text-slate-900">{person.name}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-semibold">Type</span>
                <span className={`font-black ${isBorrowed ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {isBorrowed ? 'I Borrowed (ادھار لیا)' : 'I Lent (ادھار دیا)'}
                </span>
              </div>
              <div className="flex justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-semibold">Date</span>
                <span className="font-medium text-slate-800">{formatDate(savedLoan.date)}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-semibold">Amount</span>
                <span className="font-black text-slate-900 text-sm">{formatPKR(savedLoan.amount)}</span>
              </div>
              {savedLoan.notes && (
                <div className="pt-1 text-[11px] text-slate-600">
                  <span className="text-slate-400 block">Notes:</span>
                  <span>{savedLoan.notes}</span>
                </div>
              )}
            </div>

            {/* Download PDF Button Below Saved Record */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => handleDownloadPdf(savedLoan)}
                disabled={isGeneratingPdf}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-black text-xs sm:text-sm rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>{isGeneratingPdf ? 'Generating PDF...' : 'Download PDF Voucher (رسید ڈاؤنلوڈ)'}</span>
              </button>
              <p className="text-[11px] text-center text-slate-500">
                Saves official PDF voucher directly to your phone's <strong>Downloads</strong> folder.
              </p>
            </div>

            {/* Action buttons */}
            <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 py-2.5 border border-slate-300 text-slate-700 font-semibold rounded-xl text-xs hover:bg-slate-50 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Another</span>
              </button>
              <button
                type="button"
                onClick={handleModalClose}
                className="flex-1 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl text-xs shadow-sm cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Loan Type Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Transaction Direction
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType('borrowed')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                    isBorrowed
                      ? 'bg-amber-50 border-amber-500 text-amber-800 shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  <span>I Borrowed (لیا)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setType('lent')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                    !isBorrowed
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>I Lent (دیا)</span>
                </button>
              </div>
            </div>

            {/* Date Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Date (تاریخ)
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Amount Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Amount (رقم - PKR) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-xs text-slate-500">
                  Rs.
                </span>
                <input
                  type="number"
                  min="1"
                  step="any"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  autoFocus
                  className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-xl text-sm font-black text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Notes / Reason */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Reason / Notes (تفصیل / وجہ - اختیاری)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. For shop maintenance, emergency cash..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-medium focus:border-blue-600 focus:outline-none"
              />
            </div>

            {/* Actions */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleModalClose}
                disabled={isSubmitting}
                className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-5 py-2 text-white font-bold rounded-xl text-xs shadow-md transition cursor-pointer flex items-center gap-1.5 ${
                  isBorrowed ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? 'Saving...' : 'Save Loan Record'}</span>
              </button>
            </div>
          </form>
        )}
      </div>

      <PdfDownloadFeedbackModal
        isOpen={Boolean(pdfFeedback)}
        onClose={() => setPdfFeedback(null)}
        filename={pdfFeedback?.filename || ''}
        location={pdfFeedback?.location || ''}
        blob={pdfFeedback?.blob || null}
        canShare={pdfFeedback?.canShare || false}
        title={pdfFeedback?.title || `Loan Voucher - ${person.name}`}
      />
    </div>
  );
};
