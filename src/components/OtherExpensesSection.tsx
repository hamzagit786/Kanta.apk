import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Receipt, 
  Search, 
  Filter,
  Users,
  ChevronRight,
  UserPlus,
  AlertTriangle,
  RotateCcw,
  Download,
  AlertCircle
} from 'lucide-react';
import { OtherExpense, ExpenseCreditor } from '../types';
import { useKantaData } from '../context/KantaDataContext';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatPKR } from '../lib/formatters';
import { generateExpenseVoucherPdf, savePdfToDevice } from '../lib/pdfGenerator';
import { PdfDownloadFeedbackModal } from './common/PdfDownloadFeedbackModal';
import { AddExpenseModal } from './expenses/AddExpenseModal';
import { CreditorAccountView } from './expenses/CreditorAccountView';

interface OtherExpensesSectionProps {
  onBack: () => void;
}

export const OtherExpensesSection: React.FC<OtherExpensesSectionProps> = ({ onBack }) => {
  const { 
    expenses, 
    expenseCreditors, 
    deleteExpense, 
    getCreditorBalances 
  } = useKantaData();
  const { shopName, ownerName } = useAuth();

  // Tab: 'all_expenses' | 'creditors'
  const [activeTab, setActiveTab] = useState<'all_expenses' | 'creditors'>('all_expenses');
  const [selectedCreditorId, setSelectedCreditorId] = useState<string | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<OtherExpense | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'cash' | 'credit'>('all');

  // PDF download state
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);
  const [pdfFeedback, setPdfFeedback] = useState<{
    filename: string;
    location: string;
    blob: Blob | null;
    canShare: boolean;
    title?: string;
  } | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleDownloadExpensePdf = async (expense: OtherExpense) => {
    if (generatingPdfId) return;
    setGeneratingPdfId(expense.id);
    setDownloadError(null);
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
        setDownloadError(result.error || 'Failed to download PDF.');
      }
    } catch (err) {
      console.error(err);
      setDownloadError('Could not generate PDF expense voucher.');
    } finally {
      setGeneratingPdfId(null);
    }
  };

  const selectedCreditor = expenseCreditors.find((c) => c.id === selectedCreditorId) || null;

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      const matchSearch = 
        (exp.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        exp.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (exp.creditorName || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'all' || exp.paymentStatus === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [expenses, searchQuery, statusFilter]);

  // Overall totals
  const totalAmount = useMemo(() => {
    return expenses.reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const totalCreditDue = useMemo(() => {
    return expenses
      .filter((e) => e.paymentStatus === 'credit')
      .reduce((sum, e) => sum + (e.dueAmount ?? e.amount), 0);
  }, [expenses]);

  const totalCashPaid = useMemo(() => {
    return expenses.reduce((sum, e) => sum + (e.paidAmount || 0), 0);
  }, [expenses]);

  const confirmDeleteExpense = async () => {
    if (!expenseToDelete) return;
    try {
      await deleteExpense(expenseToDelete.id);
      setExpenseToDelete(null);
    } catch (err) {
      console.error(err);
      alert('Failed to delete expense.');
    }
  };

  // If viewing an individual creditor's account:
  if (selectedCreditor) {
    return (
      <CreditorAccountView
        creditor={selectedCreditor}
        onBack={() => setSelectedCreditorId(null)}
      />
    );
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-700 hover:text-blue-700 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Home</span>
        </button>
        <div className="text-center">
          <h2 className="text-sm sm:text-base font-bold text-slate-900">
            Other Expenses (دیگر اخراجات)
          </h2>
          <span className="text-[11px] text-slate-400">
            Cash Paid & Bought on Credit (Udhar)
          </span>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-sm cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Expense</span>
        </button>
      </div>

      {/* Sub Tabs: All Expenses VS Expense Creditors */}
      <div className="grid grid-cols-2 bg-slate-200 p-1 rounded-xl text-xs sm:text-sm font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('all_expenses')}
          className={`py-2 rounded-lg transition cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'all_expenses'
              ? 'bg-white text-blue-700 shadow-xs font-black'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>All Expenses ({expenses.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('creditors')}
          className={`py-2 rounded-lg transition cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'creditors'
              ? 'bg-white text-blue-700 shadow-xs font-black'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Expense Creditors ({expenseCreditors.length})</span>
        </button>
      </div>

      {/* Summary Total Cards */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Total Expenses Amount
            </span>
            <div className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
              {formatPKR(totalAmount)}
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              All cash & credit bills
            </span>
          </div>

          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
              Total Paid So Far
            </span>
            <div className="text-lg sm:text-xl font-black text-emerald-700 mt-0.5">
              {formatPKR(totalCashPaid)}
            </div>
            <span className="text-[11px] text-emerald-600 mt-0.5 block">
              Cash paid + credit repayments
            </span>
          </div>

          <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">
              Outstanding Credit Due
            </span>
            <div className="text-lg sm:text-xl font-black text-rose-700 mt-0.5">
              {formatPKR(totalCreditDue)}
            </div>
            <span className="text-[11px] text-rose-600 mt-0.5 block">
              Remaining debt to creditors
            </span>
          </div>
        </div>
      </div>

      {/* TAB 1: ALL EXPENSES */}
      {activeTab === 'all_expenses' && (
        <div className="space-y-4">
          {/* Filter and Search Bar */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3 sm:p-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search expense description, category, or creditor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs sm:text-sm pl-9 pr-3.5 py-2 border border-slate-300 rounded-xl focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'cash' | 'credit')}
                className="text-xs sm:text-sm border border-slate-300 rounded-xl px-3 py-2 bg-white focus:border-blue-600 focus:outline-none font-semibold"
              >
                <option value="all">All Payment Statuses</option>
                <option value="cash">Cash Paid Only</option>
                <option value="credit">Bought on Credit Only</option>
              </select>
            </div>
          </div>

          {/* Expenses Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {filteredExpenses.length === 0 ? (
              <div className="p-10 text-center space-y-3">
                <Receipt className="w-12 h-12 text-slate-300 mx-auto" />
                <p className="text-sm font-semibold text-slate-600">
                  No expenses found.
                </p>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer"
                >
                  + Add New Expense
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3">Category</th>
                      <th className="py-3 px-3">Description</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3 text-right">Total Amount</th>
                      <th className="py-3 px-3 text-right">Remaining Due</th>
                      <th className="py-3 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredExpenses.map((exp) => {
                      const isCredit = exp.paymentStatus === 'credit';
                      const due = isCredit ? (exp.dueAmount ?? exp.amount) : 0;

                      return (
                        <tr key={exp.id} className="hover:bg-slate-50 transition">
                          <td className="py-3 px-3 font-semibold text-slate-700 whitespace-nowrap">
                            {formatDate(exp.date)}
                          </td>
                          <td className="py-3 px-3 font-bold text-slate-900">
                            {exp.category}
                          </td>
                          <td className="py-3 px-3 text-slate-600">
                            {exp.description || '-'}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            {isCredit ? (
                              <button
                                onClick={() => exp.creditorId && setSelectedCreditorId(exp.creditorId)}
                                className="inline-flex items-center gap-1 font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded hover:bg-amber-100 cursor-pointer"
                              >
                                <span>Credit ({exp.creditorName || 'Person'})</span>
                              </button>
                            ) : (
                              <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                Cash Paid
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-black text-slate-900 text-sm">
                            {formatPKR(exp.amount)}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className={`font-black px-2 py-0.5 rounded ${
                              due > 0 
                                ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                                : 'text-slate-400'
                            }`}>
                              {due > 0 ? formatPKR(due) : 'Nil'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Download PDF button for previously saved expense */}
                              <button
                                onClick={() => handleDownloadExpensePdf(exp)}
                                disabled={generatingPdfId === exp.id}
                                title="Download PDF Voucher"
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-lg cursor-pointer flex items-center gap-1 font-bold text-[11px] transition shadow-2xs active:scale-95 disabled:opacity-50"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>{generatingPdfId === exp.id ? 'Saving...' : 'PDF'}</span>
                              </button>
                              <button
                                onClick={() => setExpenseToDelete(exp)}
                                title="Delete Expense"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: EXPENSE CREDITORS LIST */}
      {activeTab === 'creditors' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Expense Creditor Accounts (ادھار دینے والے)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Persons from whom expenses were bought on credit
              </p>
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Credit Expense</span>
            </button>
          </div>

          {expenseCreditors.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <Users className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-600">
                No expense creditors added yet.
              </p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                When you record an expense as "Bought on Credit", the creditor will automatically appear here.
              </p>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add First Credit Expense</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {expenseCreditors.map((creditor) => {
                const b = getCreditorBalances(creditor.id);

                return (
                  <div
                    key={creditor.id}
                    className="py-3.5 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 rounded-xl transition"
                  >
                    <button
                      onClick={() => setSelectedCreditorId(creditor.id)}
                      className="flex-1 text-left flex items-center gap-3 cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-900 font-black text-sm flex items-center justify-center shrink-0">
                        {creditor.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 text-sm sm:text-base hover:text-blue-700 transition">
                          {creditor.name}
                        </span>
                        {creditor.phone && (
                          <span className="text-[11px] text-slate-500 block">
                            Phone: {creditor.phone}
                          </span>
                        )}
                      </div>
                    </button>

                    <div className="flex items-center gap-4 justify-between sm:justify-end">
                      <div className="text-right text-xs">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">
                          Remaining Due
                        </span>
                        <span className={`font-black text-sm ${
                          b.remainingDue > 0 ? 'text-rose-700' : 'text-slate-600'
                        }`}>
                          {formatPKR(b.remainingDue)}
                        </span>
                      </div>

                      <button
                        onClick={() => setSelectedCreditorId(creditor.id)}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-lg cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        <span>Open Khata</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add Expense Modal */}
      <AddExpenseModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {}}
      />

      {/* Delete Expense Modal */}
      {expenseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base text-center">
              Delete Expense?
            </h3>
            <p className="text-xs text-slate-600 text-center mt-1.5">
              Are you sure you want to delete this expense of <strong>{formatPKR(expenseToDelete.amount)}</strong> ({expenseToDelete.category})?
            </p>
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setExpenseToDelete(null)}
                className="px-3.5 py-1.5 border border-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteExpense}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
