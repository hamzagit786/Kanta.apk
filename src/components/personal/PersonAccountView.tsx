import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  RotateCcw, 
  Calendar, 
  Phone, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Search, 
  Filter,
  DollarSign,
  User,
  Clock,
  Download
} from 'lucide-react';
import { PersonalPerson, PersonalLoan, PersonalRepayment, LoanType } from '../../types';
import { useKantaData } from '../../context/KantaDataContext';
import { useAuth } from '../../context/AuthContext';
import { formatDate, formatPKR } from '../../lib/formatters';
import { 
  generatePersonalLoanSlipPdf, 
  generatePersonalRepaymentSlipPdf, 
  generatePersonStatementPdf, 
  savePdfToDevice 
} from '../../lib/pdfGenerator';
import { PdfDownloadFeedbackModal } from '../common/PdfDownloadFeedbackModal';
import { AddLoanModal } from './AddLoanModal';
import { RecordRepaymentModal } from './RecordRepaymentModal';

interface PersonAccountViewProps {
  person: PersonalPerson;
  onBack: () => void;
}

export const PersonAccountView: React.FC<PersonAccountViewProps> = ({
  person,
  onBack,
}) => {
  const { 
    getPersonLoans, 
    getPersonRepayments, 
    getPersonBalances, 
    getLoanRemaining,
    deletePersonalLoan,
    deletePersonalRepayment,
    deletePersonalPerson
  } = useKantaData();
  const { shopName, ownerName } = useAuth();

  // Strict isolation: Only this person's loans & repayments
  const personLoans = useMemo(() => getPersonLoans(person.id), [getPersonLoans, person.id]);
  const personRepayments = useMemo(() => getPersonRepayments(person.id), [getPersonRepayments, person.id]);
  const balances = useMemo(() => getPersonBalances(person.id), [getPersonBalances, person.id]);

  // Modal controls
  const [loanModalOpen, setLoanModalOpen] = useState(false);
  const [loanModalType, setLoanModalType] = useState<LoanType>('borrowed');
  const [repayModalOpen, setRepayModalOpen] = useState(false);
  const [preselectedLoanId, setPreselectedLoanId] = useState<string | undefined>(undefined);

  // Deletion modals
  const [loanToDelete, setLoanToDelete] = useState<PersonalLoan | null>(null);
  const [repaymentToDelete, setRepaymentToDelete] = useState<PersonalRepayment | null>(null);
  const [isDeletingPerson, setIsDeletingPerson] = useState(false);

  // PDF Download States
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);
  const [isGeneratingStatement, setIsGeneratingStatement] = useState(false);
  const [pdfFeedback, setPdfFeedback] = useState<{
    filename: string;
    location: string;
    blob: Blob | null;
    canShare: boolean;
    title?: string;
  } | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleDownloadLoanPdf = async (loan: PersonalLoan) => {
    if (generatingPdfId) return;
    setGeneratingPdfId(loan.id);
    setDownloadError(null);
    try {
      const remaining = getLoanRemaining(loan.id);
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
        setDownloadError(result.error || 'Failed to download PDF.');
      }
    } catch (err) {
      console.error(err);
      setDownloadError('Could not generate loan PDF voucher.');
    } finally {
      setGeneratingPdfId(null);
    }
  };

  const handleDownloadRepaymentPdf = async (repayment: PersonalRepayment) => {
    if (generatingPdfId) return;
    setGeneratingPdfId(repayment.id);
    setDownloadError(null);
    try {
      const linkedLoan = personLoans.find((l) => l.id === repayment.loanId) || null;
      const remAfter = linkedLoan ? getLoanRemaining(linkedLoan.id) : 0;
      const doc = generatePersonalRepaymentSlipPdf(
        repayment,
        person,
        linkedLoan,
        remAfter,
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
        setDownloadError(result.error || 'Failed to download PDF.');
      }
    } catch (err) {
      console.error(err);
      setDownloadError('Could not generate repayment PDF receipt.');
    } finally {
      setGeneratingPdfId(null);
    }
  };

  const handleDownloadStatementPdf = async () => {
    if (isGeneratingStatement || personLoans.length === 0) return;
    setIsGeneratingStatement(true);
    setDownloadError(null);
    try {
      const doc = generatePersonStatementPdf(
        person,
        personLoans,
        personRepayments,
        balances,
        shopName || 'Hamza Computerized Kanta',
        ownerName || 'Hamza Siddique',
        '03257833708'
      );
      const cleanDate = new Date().toISOString().split('T')[0];
      const safeName = person.name.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Record_${cleanDate}_Statement_${safeName}.pdf`;

      const result = await savePdfToDevice(doc, filename, `Account Statement - ${person.name}`);
      if (result.success) {
        setPdfFeedback({
          filename: result.filename,
          location: result.location,
          blob: result.blob,
          canShare: result.canShare,
          title: `Account Statement - ${person.name}`,
        });
      } else {
        setDownloadError(result.error || 'Failed to download statement.');
      }
    } catch (err) {
      console.error(err);
      setDownloadError('Could not generate account statement PDF.');
    } finally {
      setIsGeneratingStatement(false);
    }
  };

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'borrowed' | 'lent'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'settled'>('all');

  const openAddLoan = (type: LoanType) => {
    setLoanModalType(type);
    setLoanModalOpen(true);
  };

  const openRecordRepay = (loanId?: string) => {
    setPreselectedLoanId(loanId);
    setRepayModalOpen(true);
  };

  // Filtered loans
  const filteredLoans = useMemo(() => {
    return personLoans.filter((loan) => {
      const matchType = typeFilter === 'all' || loan.type === typeFilter;
      const remaining = getLoanRemaining(loan.id);
      const matchStatus = 
        statusFilter === 'all' ||
        (statusFilter === 'pending' && remaining > 0) ||
        (statusFilter === 'settled' && remaining === 0);
      const matchSearch = 
        (loan.notes || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        loan.date.includes(searchQuery);
      return matchType && matchStatus && matchSearch;
    });
  }, [personLoans, typeFilter, statusFilter, searchQuery, getLoanRemaining]);

  const confirmDeleteLoan = async () => {
    if (!loanToDelete) return;
    try {
      await deletePersonalLoan(loanToDelete.id);
      setLoanToDelete(null);
    } catch (err) {
      console.error(err);
      alert('Failed to delete loan.');
    }
  };

  const confirmDeleteRepayment = async () => {
    if (!repaymentToDelete) return;
    try {
      await deletePersonalRepayment(repaymentToDelete.id);
      setRepaymentToDelete(null);
    } catch (err) {
      console.error(err);
      alert('Failed to delete repayment.');
    }
  };

  const confirmDeletePerson = async () => {
    try {
      await deletePersonalPerson(person.id);
      onBack();
    } catch (err) {
      console.error(err);
      alert('Failed to delete person account.');
    }
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Top Header & Navigation */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-700 hover:text-blue-700 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All People</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
            ID: {person.id.substring(0, 8)}...
          </span>
          <button
            onClick={() => setIsDeletingPerson(true)}
            title="Delete Person Account"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Person Profile Header & Balances */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-800 font-black text-lg flex items-center justify-center">
                {person.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {person.name}'s Account
                </h1>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                  {person.phone && (
                    <span className="flex items-center gap-1 font-semibold text-blue-700">
                      <Phone className="w-3.5 h-3.5" />
                      {person.phone}
                    </span>
                  )}
                  {person.notes && (
                    <span className="flex items-center gap-1 text-slate-600">
                      <FileText className="w-3.5 h-3.5" />
                      {person.notes}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons: Borrowed, Lent, Record Repayment, Download Statement */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadStatementPdf}
              disabled={isGeneratingStatement || personLoans.length === 0}
              className="flex items-center gap-1.5 bg-blue-900 hover:bg-blue-950 disabled:opacity-50 text-white font-bold text-xs sm:text-sm px-3.5 py-2.5 rounded-xl shadow-sm transition cursor-pointer"
              title="Download complete ledger statement as PDF"
            >
              <FileText className="w-4 h-4 text-blue-200" />
              <span>{isGeneratingStatement ? 'Generating...' : 'Download Statement (PDF)'}</span>
            </button>

            <button
              onClick={() => openAddLoan('borrowed')}
              className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm px-3.5 py-2.5 rounded-xl shadow-sm transition cursor-pointer"
            >
              <ArrowDownLeft className="w-4 h-4 text-amber-200" />
              <span>+ I Borrowed Money</span>
            </button>

            <button
              onClick={() => openAddLoan('lent')}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm px-3.5 py-2.5 rounded-xl shadow-sm transition cursor-pointer"
            >
              <ArrowUpRight className="w-4 h-4 text-emerald-200" />
              <span>+ I Lent Money</span>
            </button>

            <button
              onClick={() => openRecordRepay()}
              disabled={personLoans.length === 0}
              className="flex items-center gap-1.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-bold text-xs sm:text-sm px-3.5 py-2.5 rounded-xl shadow-sm transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Record Repayment</span>
            </button>
          </div>
        </div>

        {/* The 3 Required Independent Automatic Balance Calculations */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* 1. Money I Borrowed — Remaining */}
          <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 block">
                Money I Borrowed — Remaining
              </span>
              <ArrowDownLeft className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-900 mt-1">
              {formatPKR(balances.remainingBorrowed)}
            </div>
            <div className="text-[11px] text-amber-700 mt-1 flex items-center justify-between">
              <span>Total: {formatPKR(balances.totalBorrowed)}</span>
              <span>Repaid: {formatPKR(balances.totalRepaidBorrowed)}</span>
            </div>
          </div>

          {/* 2. Money I Lent — Remaining */}
          <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900 block">
                Money I Lent — Remaining
              </span>
              <ArrowUpRight className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-900 mt-1">
              {formatPKR(balances.remainingLent)}
            </div>
            <div className="text-[11px] text-emerald-700 mt-1 flex items-center justify-between">
              <span>Total: {formatPKR(balances.totalLent)}</span>
              <span>Received: {formatPKR(balances.totalRepaidLent)}</span>
            </div>
          </div>

          {/* 3. Net Position */}
          <div className={`p-4 rounded-xl border ${
            balances.netPosition > 0
              ? 'bg-emerald-100/70 border-emerald-300'
              : balances.netPosition < 0
              ? 'bg-rose-100/70 border-rose-300'
              : 'bg-slate-50 border-slate-200'
          }`}>
            <span className={`text-[10px] font-bold uppercase tracking-wider block ${
              balances.netPosition > 0 ? 'text-emerald-900' : balances.netPosition < 0 ? 'text-rose-900' : 'text-slate-600'
            }`}>
              Net Position (خالص پوزیشن)
            </span>
            <div className={`text-xl sm:text-2xl font-black mt-1 ${
              balances.netPosition > 0 ? 'text-emerald-800' : balances.netPosition < 0 ? 'text-rose-800' : 'text-slate-700'
            }`}>
              {formatPKR(Math.abs(balances.netPosition))}
            </div>
            <span className={`text-[11px] font-semibold mt-1 block ${
              balances.netPosition > 0 ? 'text-emerald-700' : balances.netPosition < 0 ? 'text-rose-700' : 'text-slate-500'
            }`}>
              {balances.netPosition > 0
                ? 'He owes you (آپ کو رقم ملے گی)'
                : balances.netPosition < 0
                ? 'You owe him (آپ کو رقم دینی ہے)'
                : 'All Settled (برابر ہے)'}
            </span>
          </div>
        </div>
      </div>

      {/* Transaction History & Records Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>Loan & Udhar Transactions</span>
              <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                {personLoans.length}
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Strictly showing loans and repayments for <strong>{person.name}</strong> only
            </p>
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'all' | 'borrowed' | 'lent')}
              className="text-xs font-semibold border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 focus:border-blue-600 focus:outline-none"
            >
              <option value="all">All Types</option>
              <option value="borrowed">Borrowed Only</option>
              <option value="lent">Lent Only</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'pending' | 'settled')}
              className="text-xs font-semibold border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 focus:border-blue-600 focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending / Remaining</option>
              <option value="settled">Fully Settled</option>
            </select>
          </div>
        </div>

        {filteredLoans.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <DollarSign className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-600">
              No loan records for {person.name} matching your filter.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => openAddLoan('borrowed')}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl cursor-pointer shadow-sm transition"
              >
                + I Borrowed Money
              </button>
              <button
                onClick={() => openAddLoan('lent')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl cursor-pointer shadow-sm transition"
              >
                + I Lent Money
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLoans.map((loan) => {
              const repayments = personRepayments.filter((r) => r.loanId === loan.id);
              const totalRepaid = repayments.reduce((sum, r) => sum + r.amount, 0);
              const remaining = Math.max(0, loan.amount - totalRepaid);
              const isBorrowed = loan.type === 'borrowed';

              return (
                <div
                  key={loan.id}
                  className="p-4 rounded-xl border border-slate-200 hover:border-blue-300 transition bg-slate-50/40 space-y-3"
                >
                  {/* Top Loan Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                        isBorrowed
                          ? 'bg-amber-100 text-amber-900 border border-amber-200'
                          : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                      }`}>
                        {isBorrowed ? (
                          <>
                            <ArrowDownLeft className="w-3.5 h-3.5 text-amber-700" />
                            <span>I Borrowed</span>
                          </>
                        ) : (
                          <>
                            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-700" />
                            <span>I Lent</span>
                          </>
                        )}
                      </span>

                      <span className="text-xs font-semibold text-slate-600">
                        {formatDate(loan.date)}
                      </span>

                      {loan.notes && (
                        <span className="text-xs text-slate-500 italic max-w-xs truncate">
                          "{loan.notes}"
                        </span>
                      )}
                    </div>

                    {/* Financial Figures for this loan */}
                    <div className="flex items-center gap-4 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Original</span>
                        <span className="font-bold text-slate-800">{formatPKR(loan.amount)}</span>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Repaid</span>
                        <span className="font-bold text-emerald-700">{formatPKR(totalRepaid)}</span>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Remaining</span>
                        <span className={`font-black text-xs px-2 py-0.5 rounded ${
                          remaining > 0
                            ? isBorrowed
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-emerald-100 text-emerald-900'
                            : 'bg-slate-200 text-slate-600'
                        }`}>
                          {formatPKR(remaining)}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 ml-2">
                        {/* Download PDF button for previously saved loan */}
                        <button
                          onClick={() => handleDownloadLoanPdf(loan)}
                          disabled={generatingPdfId === loan.id}
                          title="Download PDF Voucher"
                          className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-lg cursor-pointer flex items-center gap-1 font-bold text-[11px] transition shadow-2xs active:scale-95 disabled:opacity-50"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>{generatingPdfId === loan.id ? 'Saving...' : 'PDF'}</span>
                        </button>

                        {remaining > 0 && (
                          <button
                            onClick={() => openRecordRepay(loan.id)}
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg cursor-pointer transition"
                          >
                            Repay
                          </button>
                        )}
                        <button
                          onClick={() => setLoanToDelete(loan)}
                          title="Delete Loan"
                          className="p-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Repayments History for this loan */}
                  {repayments.length > 0 && (
                    <div className="bg-white rounded-lg p-3 border border-slate-200/80 space-y-1.5 text-xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Repayment Installments ({repayments.length}):
                      </span>
                      <div className="divide-y divide-slate-100">
                        {repayments.map((rep) => (
                          <div key={rep.id} className="py-1.5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500 font-medium">{formatDate(rep.date)}</span>
                              {rep.notes && (
                                <span className="text-slate-400 italic">({rep.notes})</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-emerald-700">
                                {formatPKR(rep.amount)}
                              </span>
                              {/* Download PDF button for previously saved repayment */}
                              <button
                                onClick={() => handleDownloadRepaymentPdf(rep)}
                                disabled={generatingPdfId === rep.id}
                                title="Download PDF Receipt"
                                className="px-1.5 py-0.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded cursor-pointer transition flex items-center gap-0.5 font-bold text-[10px]"
                              >
                                <Download className="w-3 h-3" />
                                <span>PDF</span>
                              </button>
                              <button
                                onClick={() => setRepaymentToDelete(rep)}
                                title="Delete Repayment"
                                className="p-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer transition"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Loan Modal */}
      <AddLoanModal
        person={person}
        defaultType={loanModalType}
        isOpen={loanModalOpen}
        onClose={() => setLoanModalOpen(false)}
        onSuccess={() => {}}
      />

      {/* Record Repayment Modal */}
      <RecordRepaymentModal
        person={person}
        preselectedLoanId={preselectedLoanId}
        isOpen={repayModalOpen}
        onClose={() => {
          setRepayModalOpen(false);
          setPreselectedLoanId(undefined);
        }}
        onSuccess={() => {}}
      />

      {/* Delete Loan Confirmation Modal */}
      {loanToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base text-center">
              Delete Loan Record?
            </h3>
            <p className="text-xs text-slate-600 text-center mt-1.5">
              Are you sure you want to delete this {loanToDelete.type} loan of <strong>{formatPKR(loanToDelete.amount)}</strong>? All linked repayments will also be removed.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setLoanToDelete(null)}
                className="px-3.5 py-1.5 border border-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteLoan}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Repayment Confirmation Modal */}
      {repaymentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base text-center">
              Delete Repayment Installment?
            </h3>
            <p className="text-xs text-slate-600 text-center mt-1.5">
              Are you sure you want to delete this repayment of <strong>{formatPKR(repaymentToDelete.amount)}</strong>? The remaining loan balance will update immediately.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setRepaymentToDelete(null)}
                className="px-3.5 py-1.5 border border-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteRepayment}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Person Account Confirmation Modal */}
      {isDeletingPerson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base text-center">
              Delete {person.name}'s Account?
            </h3>
            <p className="text-xs text-slate-600 text-center mt-1.5">
              Are you sure you want to delete this person and all their loans and repayment records? This action cannot be undone.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setIsDeletingPerson(false)}
                className="px-3.5 py-1.5 border border-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeletePerson}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Download Feedback / Share Modal */}
      <PdfDownloadFeedbackModal
        isOpen={Boolean(pdfFeedback)}
        onClose={() => setPdfFeedback(null)}
        filename={pdfFeedback?.filename || ''}
        location={pdfFeedback?.location || ''}
        blob={pdfFeedback?.blob || null}
        canShare={pdfFeedback?.canShare || false}
        title={pdfFeedback?.title || `Personal Account Slip - ${person.name}`}
      />
    </div>
  );
};
