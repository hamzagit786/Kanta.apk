import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  AlertTriangle, 
  Lock, 
  RotateCcw, 
  ArrowUpRight, 
  ArrowDownLeft,
  AlertCircle,
  Download,
  Plus,
  FileText
} from 'lucide-react';
import { PersonalPerson, PersonalLoan, PersonalRepayment, RepaymentDirection } from '../../types';
import { useKantaData } from '../../context/KantaDataContext';
import { useAuth } from '../../context/AuthContext';
import { formatPKR, getTodayDateString, formatDate } from '../../lib/formatters';
import { generatePersonalRepaymentSlipPdf, savePdfToDevice } from '../../lib/pdfGenerator';
import { PdfDownloadFeedbackModal } from '../common/PdfDownloadFeedbackModal';

interface RecordRepaymentModalProps {
  person: PersonalPerson;
  preselectedLoanId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const RecordRepaymentModal: React.FC<RecordRepaymentModalProps> = ({
  person,
  preselectedLoanId,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { getPersonLoans, getLoanRemaining, addPersonalRepayment } = useKantaData();
  const { shopName, ownerName } = useAuth();

  const personLoans = useMemo(() => {
    return getPersonLoans(person.id);
  }, [getPersonLoans, person.id]);

  // Determine initial direction
  const preselectedLoan = personLoans.find((l) => l.id === preselectedLoanId);
  const initialDirection: RepaymentDirection = preselectedLoan?.type === 'lent'
    ? 'received_lent'
    : 'repaid_borrowed';

  const [direction, setDirection] = useState<RepaymentDirection>(initialDirection);
  const [selectedLoanId, setSelectedLoanId] = useState<string>('');
  const [date, setDate] = useState(getTodayDateString());
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [confirmExcess, setConfirmExcess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Post-save state
  const [savedRepayment, setSavedRepayment] = useState<PersonalRepayment | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfFeedback, setPdfFeedback] = useState<{
    filename: string;
    location: string;
    blob: Blob | null;
    canShare: boolean;
    title?: string;
  } | null>(null);

  // Filter loans by active direction
  const matchingLoans = useMemo(() => {
    const targetType = direction === 'repaid_borrowed' ? 'borrowed' : 'lent';
    return personLoans.filter((l) => l.type === targetType);
  }, [personLoans, direction]);

  useEffect(() => {
    if (isOpen) {
      setDate(getTodayDateString());
      setAmount('');
      setNotes('');
      setError(null);
      setConfirmExcess(false);
      setSavedRepayment(null);

      if (preselectedLoanId && preselectedLoan) {
        setDirection(preselectedLoan.type === 'lent' ? 'received_lent' : 'repaid_borrowed');
        setSelectedLoanId(preselectedLoanId);
      } else {
        const firstActive = matchingLoans.find((l) => getLoanRemaining(l.id) > 0) || matchingLoans[0];
        setSelectedLoanId(firstActive ? firstActive.id : '');
      }
    }
  }, [isOpen, preselectedLoanId]);

  const handleDirectionChange = (newDir: RepaymentDirection) => {
    setDirection(newDir);
    setConfirmExcess(false);
    const targetType = newDir === 'repaid_borrowed' ? 'borrowed' : 'lent';
    const available = personLoans.filter((l) => l.type === targetType);
    const firstActive = available.find((l) => getLoanRemaining(l.id) > 0) || available[0];
    setSelectedLoanId(firstActive ? firstActive.id : '');
  };

  if (!isOpen) return null;

  const currentLoan = personLoans.find((l) => l.id === selectedLoanId) || null;
  const remainingOnCurrent = currentLoan ? getLoanRemaining(currentLoan.id) : 0;
  const numAmount = Number(amount) || 0;
  const isExcess = numAmount > remainingOnCurrent && remainingOnCurrent > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedLoanId) {
      setError('Please select a loan transaction to repay against.');
      return;
    }
    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid repayment amount greater than 0.');
      return;
    }

    if (isExcess && !confirmExcess) {
      setError(
        `Repayment amount (${formatPKR(numAmount)}) exceeds the remaining loan balance (${formatPKR(remainingOnCurrent)}). Please confirm excess payment below before proceeding.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await addPersonalRepayment({
        personId: person.id,
        loanId: selectedLoanId,
        date,
        direction,
        amount: numAmount,
        notes: notes.trim() || undefined,
      });

      // Show post-save screen with Download PDF button below record
      setSavedRepayment(created);
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to record repayment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadPdf = async (repayment: PersonalRepayment) => {
    if (isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    setError(null);

    try {
      const remainingAfter = Math.max(0, remainingOnCurrent - repayment.amount);
      const doc = generatePersonalRepaymentSlipPdf(
        repayment,
        person,
        currentLoan,
        remainingAfter,
        shopName || 'Hamza Computerized Kanta',
        ownerName || 'Hamza Siddique',
        '03257833708'
      );

      const cleanDate = repayment.date || new Date().toISOString().split('T')[0];
      const safeName = person.name.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Record_${cleanDate}_Repayment_${safeName}.pdf`;

      const result = await savePdfToDevice(doc, filename, `Repayment Receipt - ${person.name}`);
      if (result.success) {
        setPdfFeedback({
          filename: result.filename,
          location: result.location,
          blob: result.blob,
          canShare: result.canShare,
          title: `Repayment Receipt - ${person.name}`,
        });
      } else {
        setError(result.error || 'Failed to download PDF.');
      }
    } catch (err) {
      console.error(err);
      setError('Could not generate PDF receipt.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const resetForm = () => {
    setSavedRepayment(null);
    setAmount('');
    setNotes('');
    setError(null);
  };

  const isRepaidBorrowed = (savedRepayment ? savedRepayment.direction : direction) === 'repaid_borrowed';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-blue-700 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-800 flex items-center justify-center">
              <RotateCcw className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">
                {savedRepayment ? 'Repayment Recorded' : 'Record Loan Repayment (قرضہ واپسی)'}
              </h3>
              <p className="text-[11px] text-blue-200">Account: {person.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-blue-200 hover:text-white hover:bg-blue-600 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* POST-SAVE CONFIRMATION VIEW WITH DOWNLOAD PDF BUTTON */}
        {savedRepayment ? (
          <div className="p-5 sm:p-6 space-y-4">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h4 className="font-black text-slate-900 text-lg">
                Repayment Recorded Successfully!
              </h4>
              <p className="text-xs text-slate-500">
                Ledger updated for <strong>{person.name}</strong>.
              </p>
            </div>

            {/* Saved Record Details Card */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5 text-xs">
              <div className="flex justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-semibold">Account</span>
                <span className="font-bold text-slate-900">{person.name}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-semibold">Action</span>
                <span className="font-bold text-emerald-700">
                  {isRepaidBorrowed ? 'I Repaid Borrowed Money (واپس ادا کیا)' : 'Received Back Lent Money (واپس وصول کیا)'}
                </span>
              </div>
              <div className="flex justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-semibold">Date</span>
                <span className="font-medium text-slate-800">{formatDate(savedRepayment.date)}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-semibold">Amount Repaid</span>
                <span className="font-black text-emerald-700 text-sm">{formatPKR(savedRepayment.amount)}</span>
              </div>
              {savedRepayment.notes && (
                <div className="pt-1 text-[11px] text-slate-600">
                  <span className="text-slate-400 block">Notes:</span>
                  <span>{savedRepayment.notes}</span>
                </div>
              )}
            </div>

            {/* Download PDF Button Below Saved Record */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => handleDownloadPdf(savedRepayment)}
                disabled={isGeneratingPdf}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-black text-xs sm:text-sm rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>{isGeneratingPdf ? 'Generating PDF...' : 'Download PDF Receipt (رسید ڈاؤنلوڈ)'}</span>
              </button>
              <p className="text-[11px] text-center text-slate-500">
                Saves official PDF receipt directly to your phone's <strong>Downloads</strong> folder.
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
                <span>Record Another</span>
              </button>
              <button
                type="button"
                onClick={onClose}
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

            {/* Direction Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Repayment Direction
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleDirectionChange('repaid_borrowed')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                    direction === 'repaid_borrowed'
                      ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <ArrowUpRight className="w-3.5 h-3.5 text-amber-600" />
                  <span>I am Returning Money (واپس کیا)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDirectionChange('received_lent')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                    direction === 'received_lent'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                  <span>I Received Money (وصول پایا)</span>
                </button>
              </div>
            </div>

            {/* Select Which Loan is Being Repaid */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Select Loan to Settle Against <span className="text-rose-500">*</span>
              </label>
              {matchingLoans.length === 0 ? (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 text-center">
                  No {direction === 'repaid_borrowed' ? 'borrowed' : 'lent'} loans found for this person.
                </div>
              ) : (
                <select
                  value={selectedLoanId}
                  onChange={(e) => setSelectedLoanId(e.target.value)}
                  required
                  className="w-full text-xs font-medium border border-slate-300 rounded-xl p-2.5 bg-white focus:border-blue-600 focus:outline-none"
                >
                  {matchingLoans.map((loan) => {
                    const rem = getLoanRemaining(loan.id);
                    return (
                      <option key={loan.id} value={loan.id}>
                        {formatDate(loan.date)} — Original: {formatPKR(loan.amount)} | Remaining Due: {formatPKR(rem)}
                        {loan.notes ? ` (${loan.notes.substring(0, 20)})` : ''}
                      </option>
                    );
                  })}
                </select>
              )}
            </div>

            {/* Current Loan Remaining Balance Highlight Card */}
            {currentLoan && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">Current Outstanding Balance</span>
                  <span className="font-bold text-slate-800">
                    {formatDate(currentLoan.date)} ({currentLoan.notes || 'Loan'})
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-black text-rose-700 text-sm">
                    {formatPKR(remainingOnCurrent)}
                  </span>
                </div>
              </div>
            )}

            {/* Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Repayment Date
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

            {/* Amount */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Repaid Amount (PKR) <span className="text-rose-500">*</span>
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

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Payment Notes / Reference (اختیاری)
              </label>
              <input
                type="text"
                placeholder="e.g. Paid via cash, bank transfer, installment 1"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-xs font-medium border border-slate-300 rounded-xl p-2.5 focus:border-blue-600 focus:outline-none"
              />
            </div>

            {/* Excess payment confirmation */}
            {isExcess && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-700" />
                  <span>Amount exceeds remaining loan balance!</span>
                </div>
                <label className="flex items-start gap-2 text-xs text-amber-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmExcess}
                    onChange={(e) => setConfirmExcess(e.target.checked)}
                    className="mt-0.5 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                  />
                  <span>
                    Yes, I confirm this excess repayment amount of {formatPKR(numAmount)}.
                  </span>
                </label>
              </div>
            )}

            {/* Submit / Cancel */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || matchingLoans.length === 0}
                className="px-5 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-xl font-bold cursor-pointer transition flex items-center gap-1.5 text-xs shadow-md"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? 'Recording...' : 'Record Repayment'}</span>
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
        title={pdfFeedback?.title || `Repayment Receipt - ${person.name}`}
      />
    </div>
  );
};
