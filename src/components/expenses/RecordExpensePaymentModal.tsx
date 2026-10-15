import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle,
  Download,
  Plus
} from 'lucide-react';
import { ExpenseCreditor, OtherExpense, ExpensePayment } from '../../types';
import { useKantaData } from '../../context/KantaDataContext';
import { useAuth } from '../../context/AuthContext';
import { formatPKR, getTodayDateString, formatDate } from '../../lib/formatters';
import { generateExpensePaymentVoucherPdf, savePdfToDevice } from '../../lib/pdfGenerator';
import { PdfDownloadFeedbackModal } from '../common/PdfDownloadFeedbackModal';

interface RecordExpensePaymentModalProps {
  creditor: ExpenseCreditor;
  preselectedExpenseId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const RecordExpensePaymentModal: React.FC<RecordExpensePaymentModalProps> = ({
  creditor,
  preselectedExpenseId,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { getCreditorExpenses, addExpensePayment } = useKantaData();
  const { shopName, ownerName } = useAuth();

  const creditorExpenses = getCreditorExpenses(creditor.id);
  const pendingExpenses = creditorExpenses.filter((e) => (e.dueAmount || 0) > 0);

  const [expenseId, setExpenseId] = useState(preselectedExpenseId || '');
  const [date, setDate] = useState(getTodayDateString());
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Post-save state
  const [savedPayment, setSavedPayment] = useState<ExpensePayment | null>(null);
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
      setDate(getTodayDateString());
      setAmount('');
      setNotes('');
      setError(null);
      setSavedPayment(null);
      if (preselectedExpenseId) {
        setExpenseId(preselectedExpenseId);
      } else {
        setExpenseId(pendingExpenses[0]?.id || creditorExpenses[0]?.id || '');
      }
    }
  }, [isOpen, preselectedExpenseId]);

  if (!isOpen) return null;

  const currentExpense = creditorExpenses.find((e) => e.id === expenseId);
  const remainingDue = currentExpense ? (currentExpense.dueAmount ?? currentExpense.amount) : 0;
  const numAmount = Number(amount) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!expenseId) {
      setError('Please select an expense entry to pay.');
      return;
    }
    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid payment amount greater than 0.');
      return;
    }
    if (numAmount > remainingDue) {
      setError(`Payment amount (${formatPKR(numAmount)}) cannot exceed outstanding due (${formatPKR(remainingDue)}).`);
      return;
    }

    setIsSubmitting(true);
    try {
      const createdPayment = await addExpensePayment({
        expenseId,
        creditorId: creditor.id,
        date,
        amount: numAmount,
        notes: notes.trim() || undefined,
      });

      // Show post-save screen with Download PDF button
      setSavedPayment(createdPayment);
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to record payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadPdf = async (payment: ExpensePayment) => {
    if (isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    setError(null);

    try {
      const exp = creditorExpenses.find((e) => e.id === payment.expenseId) || null;
      const doc = generateExpensePaymentVoucherPdf(
        payment,
        exp,
        shopName || 'Hamza Computerized Kanta',
        ownerName || 'Hamza Siddique',
        '03257833708'
      );

      const cleanDate = payment.date || new Date().toISOString().split('T')[0];
      const safeName = creditor.name.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Record_${cleanDate}_ExpensePayment_${safeName}.pdf`;

      const result = await savePdfToDevice(doc, filename, `Payment Receipt - ${creditor.name}`);
      if (result.success) {
        setPdfFeedback({
          filename: result.filename,
          location: result.location,
          blob: result.blob,
          canShare: result.canShare,
          title: `Payment Receipt - ${creditor.name}`,
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
    setSavedPayment(null);
    setAmount('');
    setNotes('');
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        <div className="bg-blue-700 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <RotateCcw className="w-5 h-5 text-blue-200" />
            <div>
              <h3 className="font-bold text-base sm:text-lg">
                {savedPayment ? 'Payment Recorded' : 'Record Payment to Creditor'}
              </h3>
              <p className="text-[11px] text-blue-200">Creditor: {creditor.name}</p>
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
        {savedPayment ? (
          <div className="p-5 sm:p-6 space-y-4">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h4 className="font-black text-slate-900 text-lg">
                Payment Recorded Successfully!
              </h4>
              <p className="text-xs text-slate-500">
                Creditor account updated for <strong>{creditor.name}</strong>.
              </p>
            </div>

            {/* Saved Record Details Card */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5 text-xs">
              <div className="flex justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-semibold">Creditor</span>
                <span className="font-bold text-slate-900">{creditor.name}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-semibold">Expense Head</span>
                <span className="font-bold text-slate-900">{currentExpense?.category || 'Credit Expense'}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-semibold">Payment Date</span>
                <span className="font-medium text-slate-800">{formatDate(savedPayment.date)}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-semibold">Amount Paid</span>
                <span className="font-black text-emerald-700 text-sm">{formatPKR(savedPayment.amount)}</span>
              </div>
              {savedPayment.notes && (
                <div className="pt-1 text-[11px] text-slate-600">
                  <span className="text-slate-400 block">Notes:</span>
                  <span>{savedPayment.notes}</span>
                </div>
              )}
            </div>

            {/* Download PDF Button Below Saved Record */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => handleDownloadPdf(savedPayment)}
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
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs sm:text-sm">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2 text-xs font-semibold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Select Credit Expense */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Select Credit Expense <span className="text-rose-500">*</span>
              </label>
              {creditorExpenses.length === 0 ? (
                <div className="p-3 bg-slate-100 rounded-xl text-center text-xs text-slate-500">
                  No credit expenses recorded under {creditor.name}.
                </div>
              ) : (
                <select
                  value={expenseId}
                  onChange={(e) => setExpenseId(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 border border-slate-300 rounded-xl bg-white focus:border-blue-600 focus:outline-none"
                >
                  {creditorExpenses.map((exp) => (
                    <option key={exp.id} value={exp.id}>
                      {formatDate(exp.date)} — {exp.category} (Total: {formatPKR(exp.amount)} | Due: {formatPKR(exp.dueAmount ?? exp.amount)})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Remaining Due Info */}
            {currentExpense && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between">
                <span className="text-xs font-bold text-rose-900">Outstanding Due on This Bill</span>
                <span className="text-sm font-black text-rose-700">
                  {formatPKR(remainingDue)}
                </span>
              </div>
            )}

            {/* Date */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Payment Date
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full text-xs font-semibold pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Payment Amount */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Amount Being Paid (PKR) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-xs text-slate-500">
                  Rs.
                </span>
                <input
                  type="number"
                  min="1"
                  max={remainingDue}
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
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Payment Notes / Ref (اختیاری)
              </label>
              <input
                type="text"
                placeholder="e.g. Paid via cash installment, EasyPaisa, bank slip"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-xs font-medium border border-slate-300 rounded-xl p-2.5 focus:border-blue-600 focus:outline-none"
              />
            </div>

            {/* Actions */}
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
                disabled={isSubmitting || creditorExpenses.length === 0}
                className="px-5 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-xl font-bold cursor-pointer transition flex items-center gap-1.5 text-xs shadow-md"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? 'Recording...' : 'Record Payment'}</span>
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
        title={pdfFeedback?.title || `Payment Receipt - ${creditor.name}`}
      />
    </div>
  );
};
