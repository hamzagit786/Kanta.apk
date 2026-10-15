import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Edit3, 
  AlertTriangle, 
  Truck, 
  Phone, 
  Scale, 
  Calendar,
  CheckCircle2,
  AlertCircle,
  Download,
  FileText
} from 'lucide-react';
import { Driver, KantaEntry } from '../types';
import { useKantaData } from '../context/KantaDataContext';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatPKR } from '../lib/formatters';
import { generateWeightSlipPdf, generateDriverStatementPdf, savePdfToDevice } from '../lib/pdfGenerator';
import { PdfDownloadFeedbackModal } from './common/PdfDownloadFeedbackModal';
import { EditRecordModal } from './EditRecordModal';

interface DriverKhataViewProps {
  driver: Driver;
  onBack: () => void;
  onOpenAddEntry: () => void;
}

export const DriverKhataView: React.FC<DriverKhataViewProps> = ({
  driver,
  onBack,
  onOpenAddEntry,
}) => {
  const { getDriverEntries, deleteEntry } = useKantaData();
  const { shopName, ownerName } = useAuth();

  // Strict Data Separation: Get ONLY this driver's entries
  const driverEntries = useMemo(() => {
    return getDriverEntries(driver.id);
  }, [driver.id, getDriverEntries]);

  // Calculate totals strictly for this driver
  const totalBilled = useMemo(() => {
    return driverEntries.reduce((sum, e) => sum + e.totalPrice, 0);
  }, [driverEntries]);

  const totalReceived = useMemo(() => {
    return driverEntries.reduce((sum, e) => sum + e.receivedPrice, 0);
  }, [driverEntries]);

  const totalDue = useMemo(() => {
    return driverEntries.reduce((sum, e) => sum + e.duePrice, 0);
  }, [driverEntries]);

  // Edit & Delete state
  const [entryToEdit, setEntryToEdit] = useState<KantaEntry | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<KantaEntry | null>(null);

  // PDF Download State
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);
  const [isGeneratingStatement, setIsGeneratingStatement] = useState<boolean>(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [pdfFeedback, setPdfFeedback] = useState<{
    filename: string;
    location: string;
    blob: Blob | null;
    canShare: boolean;
    title?: string;
  } | null>(null);

  const confirmDelete = async () => {
    if (!entryToDelete) return;
    try {
      await deleteEntry(entryToDelete.id);
      setEntryToDelete(null);
    } catch (err) {
      console.error(err);
      alert('Failed to delete entry.');
    }
  };

  // Download PDF for previously saved individual record
  const handleDownloadEntryPdf = async (entry: KantaEntry) => {
    if (generatingPdfId) return;
    setGeneratingPdfId(entry.id);
    setDownloadError(null);

    try {
      const doc = generateWeightSlipPdf(
        entry,
        driver,
        shopName || 'Hamza Computerized Kanta',
        ownerName || 'Hamza Siddique',
        '03257833708'
      );

      const slipId = (entry.id || '0000').substring(entry.id.length - 6).toUpperCase();
      const cleanDate = entry.date || new Date().toISOString().split('T')[0];
      const filename = `Record_${cleanDate}_Slip_${slipId}.pdf`;

      const result = await savePdfToDevice(doc, filename, `Weight Slip - ${driver.name}`);
      if (result.success) {
        setPdfFeedback({
          filename: result.filename,
          location: result.location,
          blob: result.blob,
          canShare: result.canShare,
          title: `Weight Slip - ${driver.name}`,
        });
      } else {
        setDownloadError(result.error || 'Failed to download PDF.');
      }
    } catch (err) {
      console.error('PDF generation error:', err);
      setDownloadError('Could not generate PDF weighbridge slip.');
    } finally {
      setGeneratingPdfId(null);
    }
  };

  // Download Complete Statement for this driver
  const handleDownloadDriverStatement = async () => {
    if (isGeneratingStatement || driverEntries.length === 0) return;
    setIsGeneratingStatement(true);
    setDownloadError(null);

    try {
      const doc = generateDriverStatementPdf(
        driver,
        driverEntries,
        shopName || 'Hamza Computerized Kanta',
        ownerName || 'Hamza Siddique',
        '03257833708'
      );

      const cleanDate = new Date().toISOString().split('T')[0];
      const safeName = driver.name.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Record_${cleanDate}_Statement_${safeName}.pdf`;

      const result = await savePdfToDevice(doc, filename, `Driver Khata Statement - ${driver.name}`);
      if (result.success) {
        setPdfFeedback({
          filename: result.filename,
          location: result.location,
          blob: result.blob,
          canShare: result.canShare,
          title: `Driver Khata Statement - ${driver.name}`,
        });
      } else {
        setDownloadError(result.error || 'Failed to download statement.');
      }
    } catch (err) {
      console.error('Statement PDF error:', err);
      setDownloadError('Could not generate driver statement PDF.');
    } finally {
      setIsGeneratingStatement(false);
    }
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Top Back Navigation Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-700 hover:text-blue-700 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Drivers</span>
        </button>
        <span className="text-xs bg-slate-100 text-slate-600 font-mono font-bold px-2 py-0.5 rounded">
          ID: {driver.id.substring(0, 8)}...
        </span>
      </div>

      {downloadError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{downloadError}</span>
          </div>
          <button 
            onClick={() => setDownloadError(null)}
            className="text-rose-500 hover:text-rose-700 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Driver Khata Header & Summary Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {driver.name}'s Khata
            </h1>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
              {driver.vehicleCategory && (
                <span className="bg-blue-50 text-blue-900 font-semibold px-2 py-0.5 rounded">
                  {driver.vehicleCategory}
                </span>
              )}
              {driver.vehicleReg && (
                <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                  {driver.vehicleReg}
                </span>
              )}
              {driver.phone && (
                <span className="flex items-center gap-1 font-semibold text-blue-700">
                  <Phone className="w-3 h-3" /> {driver.phone}
                </span>
              )}
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleDownloadDriverStatement}
              disabled={isGeneratingStatement || driverEntries.length === 0}
              className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-sm transition cursor-pointer"
              title="Download complete ledger statement as PDF"
            >
              <FileText className="w-4 h-4" />
              <span>{isGeneratingStatement ? 'Generating...' : 'Download Statement (PDF)'}</span>
            </button>
            <button
              onClick={onOpenAddEntry}
              className="flex items-center justify-center gap-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add New Entry</span>
            </button>
          </div>
        </div>

        {/* The 3 Required Summary Totals: Total Billed, Total Received, Total Due */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* Total Billed */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Total Billed
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              {formatPKR(totalBilled)}
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              All weight records for {driver.name}
            </span>
          </div>

          {/* Total Received */}
          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
              Total Received
            </span>
            <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">
              {formatPKR(totalReceived)}
            </div>
            <span className="text-[11px] text-emerald-600 mt-0.5 block">
              Cash received from {driver.name}
            </span>
          </div>

          {/* Total Due */}
          <div className="p-4 bg-rose-50 rounded-xl border border-rose-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">
              Total Due (باقی رقم)
            </span>
            <div className="text-xl sm:text-2xl font-black text-rose-700 mt-1">
              {formatPKR(totalDue)}
            </div>
            <span className="text-[11px] text-rose-600 mt-0.5 block">
              Outstanding balance
            </span>
          </div>
        </div>
      </div>

      {/* Vehicle Weight Entries Belonging to this Driver (Newest First) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>Vehicle Weight Records History</span>
            <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
              {driverEntries.length}
            </span>
          </h2>
          <span className="text-xs text-slate-400">Newest entries first</span>
        </div>

        {driverEntries.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <Scale className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-600">
              No entries yet. Add your first vehicle weight entry.
            </p>
            <button
              onClick={onOpenAddEntry}
              className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs sm:text-sm rounded-xl cursor-pointer shadow-sm transition inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add First Entry for {driver.name}</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-3 px-3 rounded-l-lg">Date</th>
                  <th className="py-3 px-3">Vehicle Category</th>
                  <th className="py-3 px-3">Vehicle Reg #</th>
                  <th className="py-3 px-3 text-center">1st Weight</th>
                  <th className="py-3 px-3 text-center">2nd Weight</th>
                  <th className="py-3 px-3 text-center">3rd Weight</th>
                  <th className="py-3 px-3 text-right">Total Price</th>
                  <th className="py-3 px-3 text-right text-emerald-700">Received Price</th>
                  <th className="py-3 px-3 text-right text-rose-700">Due Price</th>
                  <th className="py-3 px-3 text-center rounded-r-lg">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {driverEntries.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3 font-semibold text-slate-700 whitespace-nowrap">
                      {formatDate(e.date)}
                    </td>
                    <td className="py-3 px-3 text-slate-800 font-medium">
                      {e.vehicleCategory}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-blue-900 whitespace-nowrap">
                      {e.vehicleReg || '-'}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-semibold text-slate-700">
                      {e.firstWeight !== '' ? e.firstWeight : '-'}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-semibold text-slate-700">
                      {e.secondWeight !== '' ? e.secondWeight : '-'}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-semibold text-slate-700">
                      {e.thirdWeight !== '' ? e.thirdWeight : '-'}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      {formatPKR(e.totalPrice)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-700">
                      {formatPKR(e.receivedPrice)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className={`font-black text-xs px-2 py-0.5 rounded ${
                        e.duePrice > 0 
                          ? 'text-rose-700 bg-rose-50 border border-rose-200' 
                          : 'text-slate-600 bg-slate-100'
                      }`}>
                        {formatPKR(e.duePrice)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Download PDF button for previously saved record */}
                        <button
                          onClick={() => handleDownloadEntryPdf(e)}
                          disabled={generatingPdfId === e.id}
                          title="Download PDF Weighbridge Slip"
                          className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-lg cursor-pointer flex items-center gap-1 font-bold text-[11px] transition shadow-2xs active:scale-95 disabled:opacity-50"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>{generatingPdfId === e.id ? 'Saving...' : 'PDF'}</span>
                        </button>

                        <button
                          onClick={() => setEntryToEdit(e)}
                          title="Correct Entry"
                          className="p-1.5 text-blue-700 hover:text-blue-900 hover:bg-blue-50 rounded-lg cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEntryToDelete(e)}
                          title="Delete Entry"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Prominent "+ Add New Entry" Button at the bottom as requested */}
        <div className="pt-4 border-t border-slate-100 text-center">
          <button
            onClick={onOpenAddEntry}
            className="w-full sm:w-auto px-8 py-3 bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white font-black text-sm rounded-xl shadow-md transition cursor-pointer inline-flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            <span>+ Add New Entry for {driver.name}</span>
          </button>
        </div>
      </div>

      {/* Edit Entry Modal */}
      <EditRecordModal
        isOpen={Boolean(entryToEdit)}
        record={entryToEdit}
        onClose={() => setEntryToEdit(null)}
      />

      {/* Delete Entry Confirmation Modal */}
      {entryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base text-center">
              Delete Entry?
            </h3>
            <p className="text-xs text-slate-600 text-center mt-1.5">
              Are you sure you want to delete this vehicle weight entry from <strong>{driver.name}'s</strong> khata?
            </p>
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setEntryToDelete(null)}
                className="px-3.5 py-1.5 border border-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
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
        title={pdfFeedback?.title || `Hamza Kanta Slip - ${driver.name}`}
      />
    </div>
  );
};
