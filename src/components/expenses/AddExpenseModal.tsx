import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  Receipt, 
  CheckCircle2, 
  AlertTriangle, 
  User, 
  Plus, 
  CreditCard,
  Building2,
  Download,
  FileText
} from 'lucide-react';
import { ExpenseCreditor, ExpensePaymentStatus, OtherExpense } from '../../types';
import { useKantaData } from '../../context/KantaDataContext';
import { useAuth } from '../../context/AuthContext';
import { formatPKR, getTodayDateString, formatDate } from '../../lib/formatters';
import { generateExpenseVoucherPdf, savePdfToDevice } from '../../lib/pdfGenerator';
import { PdfDownloadFeedbackModal } from '../common/PdfDownloadFeedbackModal';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const EXPENSE_CATEGORIES = [
  'Electricity Bill',
  'Computer Repair',
  'Printer Paper & Ink',
  'Tea / Kharcha',
  'Rent',
  'Scale Maintenance',
  'Generator Fuel',
  'Shop Hardware',
  'Stationery',
  'Other',
];

const PAYMENT_METHODS = [
  'Cash',
  'Bank Transfer',
  'EasyPaisa',
  'JazzCash',
];

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { expenses, expenseCreditors, addExpense, addExpenseCreditor } = useKantaData();
  const { shopName, ownerName } = useAuth();

  const [date, setDate] = useState(getTodayDateString());
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<ExpensePaymentStatus>('cash');
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);

  // Credit fields
  const [creditorId, setCreditorId] = useState('');
  const [isAddingNewCreditor, setIsAddingNewCreditor] = useState(false);
  const [newCreditorName, setNewCreditorName] = useState('');
  const [newCreditorPhone, setNewCreditorPhone] = useState('');
  const [initialPaid, setInitialPaid] = useState('0');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Post-save state
  const [savedExpense, setSavedExpense] = useState<OtherExpense | null>(null);
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
      setCategory(EXPENSE_CATEGORIES[0]);
      setDescription('');
      setAmount('');
      setPaymentStatus('cash');
      setPaymentMethod(PAYMENT_METHODS[0]);
      setCreditorId(expenseCreditors[0]?.id || '');
      setIsAddingNewCreditor(false);
      setNewCreditorName('');
      setNewCreditorPhone('');
      setInitialPaid('0');
      setError(null);
      setSavedExpense(null);
    }
  }, [isOpen, expenseCreditors]);

  if (!isOpen) return null;

  const numAmount = Number(amount) || 0;
  const numPaid = paymentStatus === 'credit' ? Number(initialPaid) || 0 : numAmount;
  const numDue = Math.max(0, numAmount - numPaid);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid expense amount greater than 0.');
      return;
    }

    let finalCreditorId = creditorId;
    let finalCreditorName = '';

    if (paymentStatus === 'credit') {
      if (isAddingNewCreditor || expenseCreditors.length === 0) {
        if (!newCreditorName.trim()) {
          setError('Please enter the creditor person name (Credit Taken From).');
          return;
        }
      } else {
        if (!creditorId) {
          setError('Please select an existing creditor or add a new person.');
          return;
        }
      }

      if (numPaid > numAmount) {
        setError('Amount paid cannot exceed total expense amount.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (paymentStatus === 'credit') {
        if (isAddingNewCreditor || expenseCreditors.length === 0) {
          const createdCreditor = await addExpenseCreditor({
            name: newCreditorName.trim(),
            phone: newCreditorPhone.trim() || undefined,
          });
          finalCreditorId = createdCreditor.id;
          finalCreditorName = createdCreditor.name;
        } else {
          const found = expenseCreditors.find((c) => c.id === creditorId);
          finalCreditorName = found ? found.name : '';
        }
      }

      const createdExpense = await addExpense({
        date,
        category,
        description: description.trim() || undefined,
        amount: numAmount,
        paymentStatus,
        creditorId: paymentStatus === 'credit' ? finalCreditorId : undefined,
        creditorName: paymentStatus === 'credit' ? finalCreditorName : undefined,
        initialPaid: paymentStatus === 'credit' ? numPaid : undefined,
        paymentMethod: paymentStatus === 'cash' ? paymentMethod : undefined,
      });

      // Show post-save screen with Download PDF button below record
      setSavedExpense(createdExpense);
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save expense.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadPdf = async (expense: OtherExpense) => {
    if (isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    setError(null);

    try {
      const doc = generateExpenseVoucherPdf(
        expense,
        shopName || 'Hamza Computerized Kanta',
        ownerName || 'Hamza Siddique',
        '03257833708'
      );

      const cleanDate = expense.date || new Date().toISOString().split('T')[0];
      const safeCat = expense.category.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Record_${cleanDate}_Expense_${safeCat}.pdf`;

      const result = await savePdfToDevice(doc, filename, `Expense Voucher - ${expense.category}`);
      if (result.success) {
        setPdfFeedback({
          filename: result.filename,
          location: result.location,
          blob: result.blob,
          canShare: result.canShare,
          title: `Expense Voucher - ${expense.category}`,
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
    setSavedExpense(null);
    setDescription('');
    setAmount('');
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-blue-700 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-blue-200" />
            <div>
              <h3 className="font-bold text-base sm:text-lg">
                {savedExpense ? 'Expense Record Saved' : 'Add Other Operational Expense (اخراجات)'}
              </h3>
              <p className="text-[11px] text-blue-200">Hamza Computerized Kanta Ledger</p>
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
        {savedExpense ? (
          <div className="p-5 sm:p-6 space-y-4">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h4 className="font-black text-slate-900 text-lg">
                Expense Saved Successfully!
              </h4>
              <p className="text-xs text-slate-500">
                Recorded in business operating ledger.
              </p>
            </div>

            {/* Saved Record Details Card */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5 text-xs">
              <div className="flex justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-semibold">Expense Head</span>
                <span className="font-bold text-slate-900">{savedExpense.category}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-semibold">Payment Status</span>
                <span className={`font-bold ${savedExpense.paymentStatus === 'credit' ? 'text-rose-700' : 'text-emerald-700'}`}>
                  {savedExpense.paymentStatus === 'credit' ? 'Credit (ادھار لیا گیا)' : 'Paid Cash (نقد ادا شدہ)'}
                </span>
              </div>
              {savedExpense.creditorName && (
                <div className="flex justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-semibold">Creditor / Vendor</span>
                  <span className="font-bold text-slate-900">{savedExpense.creditorName}</span>
                </div>
              )}
              <div className="flex justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-semibold">Date</span>
                <span className="font-medium text-slate-800">{formatDate(savedExpense.date)}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-semibold">Total Amount</span>
                <span className="font-black text-slate-900 text-sm">{formatPKR(savedExpense.amount)}</span>
              </div>
              {savedExpense.paymentStatus === 'credit' && (
                <div className="flex justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-semibold">Remaining Due</span>
                  <span className="font-black text-rose-700">{formatPKR(savedExpense.dueAmount ?? savedExpense.amount)}</span>
                </div>
              )}
              {savedExpense.description && (
                <div className="pt-1 text-[11px] text-slate-600">
                  <span className="text-slate-400 block">Description:</span>
                  <span>{savedExpense.description}</span>
                </div>
              )}
            </div>

            {/* Download PDF Button Below Saved Record */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => handleDownloadPdf(savedExpense)}
                disabled={isGeneratingPdf}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-black text-xs sm:text-sm rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>{isGeneratingPdf ? 'Generating PDF...' : 'Download PDF Voucher (واؤچر ڈاؤنلوڈ)'}</span>
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

            {/* Payment Status Switcher: Cash Paid VS Bought on Credit */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Payment Type (ادائیگی کا طریقہ)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentStatus('cash')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition ${
                    paymentStatus === 'cash'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <span>Paid Cash (نقد خرچ)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentStatus('credit')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition ${
                    paymentStatus === 'credit'
                      ? 'bg-rose-50 border-rose-500 text-rose-900 shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Building2 className="w-4 h-4 text-rose-600" />
                  <span>Bought on Credit / Udhar (ادھار لیا)</span>
                </button>
              </div>
            </div>

            {/* Date & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Date
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

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Expense Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-xs font-bold border border-slate-300 rounded-xl p-2 bg-white focus:border-blue-600 focus:outline-none"
                >
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Amount & Method */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Total Amount (PKR) <span className="text-rose-500">*</span>
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

              {paymentStatus === 'cash' ? (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full text-xs font-semibold border border-slate-300 rounded-xl p-2 bg-white focus:border-blue-600 focus:outline-none"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>

            {/* Credit Details */}
            {paymentStatus === 'credit' && (
              <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-900">
                    Creditor Details (ادھار دینے والا شخص / دکان)
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAddingNewCreditor(!isAddingNewCreditor)}
                    className="text-[11px] font-bold text-blue-700 hover:underline cursor-pointer"
                  >
                    {isAddingNewCreditor ? 'Select Existing Creditor' : '+ Add New Creditor'}
                  </button>
                </div>

                {isAddingNewCreditor || expenseCreditors.length === 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <input
                        type="text"
                        placeholder="Creditor Name (e.g. Aslam Hardware)"
                        value={newCreditorName}
                        onChange={(e) => setNewCreditorName(e.target.value)}
                        required
                        className="w-full text-xs p-2 bg-white border border-rose-300 rounded-xl font-semibold"
                      />
                    </div>
                    <div>
                      <input
                        type="tel"
                        placeholder="Phone (optional)"
                        value={newCreditorPhone}
                        onChange={(e) => setNewCreditorPhone(e.target.value)}
                        className="w-full text-xs p-2 bg-white border border-rose-300 rounded-xl font-semibold"
                      />
                    </div>
                  </div>
                ) : (
                  <select
                    value={creditorId}
                    onChange={(e) => setCreditorId(e.target.value)}
                    className="w-full text-xs p-2 bg-white border border-rose-300 rounded-xl font-bold text-slate-800"
                  >
                    {expenseCreditors.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.phone ? `(${c.phone})` : ''}
                      </option>
                    ))}
                  </select>
                )}

                {/* Amount Paid So Far & Outstanding Due Calculation */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Amount Paid So Far
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">Rs.</span>
                      <input
                        type="number"
                        min="0"
                        max={numAmount}
                        value={initialPaid}
                        onChange={(e) => setInitialPaid(e.target.value)}
                        className="w-full text-sm font-black pl-8 pr-3 py-2 border border-slate-300 rounded-xl bg-white text-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-rose-700 mb-1">
                      Outstanding Expense Due
                    </label>
                    <div className="w-full text-sm font-black px-3 py-2 rounded-xl bg-rose-50 border border-rose-300 text-rose-700 flex items-center justify-between">
                      <span>Rs. {numDue.toLocaleString('en-PK')}</span>
                      <span className="text-[10px] font-bold uppercase text-rose-600">
                        {numDue > 0 ? 'Due' : 'Cleared'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Description */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Description / Particulars (اختیاری)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Paid for load cell wiring, bought stationery, generator diesel..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-medium focus:border-blue-600 focus:outline-none"
              />
            </div>

            {/* Submit */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 border border-slate-300 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold cursor-pointer transition flex items-center gap-1.5 text-xs shadow-md"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? 'Saving...' : 'Save Expense'}</span>
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
        title={pdfFeedback?.title || `Expense Voucher - ${category}`}
      />
    </div>
  );
};
