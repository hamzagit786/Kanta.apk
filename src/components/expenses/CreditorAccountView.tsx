import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, 
  Plus, 
  RotateCcw, 
  Phone, 
  FileText, 
  Trash2, 
  AlertTriangle,
  Receipt,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { ExpenseCreditor, OtherExpense, ExpensePayment } from '../../types';
import { useKantaData } from '../../context/KantaDataContext';
import { formatDate, formatPKR } from '../../lib/formatters';
import { RecordExpensePaymentModal } from './RecordExpensePaymentModal';

interface CreditorAccountViewProps {
  creditor: ExpenseCreditor;
  onBack: () => void;
}

export const CreditorAccountView: React.FC<CreditorAccountViewProps> = ({
  creditor,
  onBack,
}) => {
  const { 
    getCreditorExpenses, 
    getCreditorPayments, 
    getCreditorBalances, 
    deleteExpenseCreditor,
    deleteExpensePayment
  } = useKantaData();

  const creditorExpenses = useMemo(() => getCreditorExpenses(creditor.id), [getCreditorExpenses, creditor.id]);
  const creditorPayments = useMemo(() => getCreditorPayments(creditor.id), [getCreditorPayments, creditor.id]);
  const balances = useMemo(() => getCreditorBalances(creditor.id), [getCreditorBalances, creditor.id]);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | undefined>(undefined);
  const [paymentToDelete, setPaymentToDelete] = useState<ExpensePayment | null>(null);
  const [isDeletingCreditor, setIsDeletingCreditor] = useState(false);

  const openPaymentModal = (expId?: string) => {
    setSelectedExpenseId(expId);
    setPaymentModalOpen(true);
  };

  const confirmDeletePayment = async () => {
    if (!paymentToDelete) return;
    try {
      await deleteExpensePayment(paymentToDelete.id);
      setPaymentToDelete(null);
    } catch (err) {
      console.error(err);
      alert('Failed to delete payment.');
    }
  };

  const confirmDeleteCreditor = async () => {
    try {
      await deleteExpenseCreditor(creditor.id);
      onBack();
    } catch (err) {
      console.error(err);
      alert('Failed to delete creditor.');
    }
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-700 hover:text-blue-700 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Creditors</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
            ID: {creditor.id.substring(0, 8)}...
          </span>
          <button
            onClick={() => setIsDeletingCreditor(true)}
            title="Delete Creditor Account"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Creditor Summary Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-900 font-black text-lg flex items-center justify-center">
              {creditor.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {creditor.name}'s Account (ادھار کھاتہ)
              </h1>
              <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                {creditor.phone && (
                  <span className="flex items-center gap-1 font-semibold text-blue-700">
                    <Phone className="w-3.5 h-3.5" />
                    {creditor.phone}
                  </span>
                )}
                {creditor.notes && (
                  <span className="flex items-center gap-1 text-slate-600">
                    <FileText className="w-3.5 h-3.5" />
                    {creditor.notes}
                  </span>
                )}
                <span className="text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded">
                  Expense Creditor
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => openPaymentModal()}
            disabled={balances.remainingDue === 0}
            className="flex items-center justify-center gap-1.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-sm transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Record Payment to Creditor</span>
          </button>
        </div>

        {/* 3 Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* Total Credit Taken */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Total Credit Taken (کل ادھار خریدا)
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              {formatPKR(balances.totalCredit)}
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              {creditorExpenses.length} credit bill{creditorExpenses.length === 1 ? '' : 's'}
            </span>
          </div>

          {/* Total Paid So Far */}
          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
              Total Paid So Far (ادا شدہ رقم)
            </span>
            <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">
              {formatPKR(balances.totalPaid)}
            </div>
            <span className="text-[11px] text-emerald-600 mt-0.5 block">
              Paid to {creditor.name}
            </span>
          </div>

          {/* Outstanding Balance Due */}
          <div className="p-4 bg-rose-50 rounded-xl border border-rose-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">
              Outstanding Balance Due (باقی واجب الادا)
            </span>
            <div className="text-xl sm:text-2xl font-black text-rose-700 mt-1">
              {formatPKR(balances.remainingDue)}
            </div>
            <span className="text-[11px] text-rose-600 mt-0.5 block">
              {balances.remainingDue > 0 ? 'To pay to creditor' : 'All bills settled'}
            </span>
          </div>
        </div>
      </div>

      {/* Credit Expenses Bought from this Creditor */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>Expenses Bought on Credit from {creditor.name}</span>
            <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
              {creditorExpenses.length}
            </span>
          </h2>
          <span className="text-xs text-slate-400">Strictly isolated from driver khata</span>
        </div>

        {creditorExpenses.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No credit expenses recorded for {creditor.name}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Description</th>
                  <th className="py-3 px-3 text-right">Total Bill</th>
                  <th className="py-3 px-3 text-right text-emerald-700">Paid</th>
                  <th className="py-3 px-3 text-right text-rose-700">Due (باقی)</th>
                  <th className="py-3 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {creditorExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3 font-semibold text-slate-700 whitespace-nowrap">
                      {formatDate(exp.date)}
                    </td>
                    <td className="py-3 px-3 font-bold text-blue-900">
                      {exp.category}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {exp.description || '-'}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-slate-900">
                      {formatPKR(exp.amount)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-700">
                      {formatPKR(exp.paidAmount || 0)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className={`font-black px-2 py-0.5 rounded ${
                        (exp.dueAmount ?? exp.amount) > 0
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {formatPKR(exp.dueAmount ?? exp.amount)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      {(exp.dueAmount ?? exp.amount) > 0 ? (
                        <button
                          onClick={() => openPaymentModal(exp.id)}
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg cursor-pointer"
                        >
                          Pay
                        </button>
                      ) : (
                        <span className="text-[11px] font-semibold text-emerald-700 flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Settled
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment History to this Creditor */}
      {creditorPayments.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6 space-y-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center justify-between">
            <span>Payment History to {creditor.name} ({creditorPayments.length})</span>
            <span className="text-xs text-emerald-700 font-bold">
              Total Paid: {formatPKR(balances.totalPaid)}
            </span>
          </h3>
          <div className="divide-y divide-slate-100 text-xs">
            {creditorPayments.map((p) => (
              <div key={p.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800">{formatDate(p.date)}</span>
                  {p.notes && <span className="text-slate-400 italic ml-2">"{p.notes}"</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-emerald-700 text-sm">
                    {formatPKR(p.amount)}
                  </span>
                  <button
                    onClick={() => setPaymentToDelete(p)}
                    title="Delete payment"
                    className="p-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      <RecordExpensePaymentModal
        creditor={creditor}
        preselectedExpenseId={selectedExpenseId}
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        onSuccess={() => {}}
      />

      {/* Delete Payment Modal */}
      {paymentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base text-center">
              Delete Payment Record?
            </h3>
            <p className="text-xs text-slate-600 text-center mt-1.5">
              Are you sure you want to delete this payment of <strong>{formatPKR(paymentToDelete.amount)}</strong>? The outstanding bill due will update immediately.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setPaymentToDelete(null)}
                className="px-3.5 py-1.5 border border-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeletePayment}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Creditor Modal */}
      {isDeletingCreditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base text-center">
              Delete Creditor Account?
            </h3>
            <p className="text-xs text-slate-600 text-center mt-1.5">
              Are you sure you want to delete <strong>{creditor.name}</strong> from your expense creditors list?
            </p>
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setIsDeletingCreditor(false)}
                className="px-3.5 py-1.5 border border-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteCreditor}
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
