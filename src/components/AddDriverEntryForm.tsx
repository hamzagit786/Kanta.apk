import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Calendar, 
  Truck, 
  Scale, 
  CheckCircle2, 
  AlertTriangle, 
  Lock,
  AlertCircle,
  Download,
  Share2,
  FileText,
  Plus
} from 'lucide-react';
import { Driver, KantaEntry, VehicleCategory } from '../types';
import { useKantaData } from '../context/KantaDataContext';
import { useAuth } from '../context/AuthContext';
import { getTodayDateString, formatPKR, formatDate } from '../lib/formatters';
import { generateWeightSlipPdf, savePdfToDevice, sharePdfFile } from '../lib/pdfGenerator';
import { PdfDownloadFeedbackModal } from './common/PdfDownloadFeedbackModal';

interface AddDriverEntryFormProps {
  driver: Driver;
  onBack: () => void;
  onSaved: () => void;
}

const VEHICLE_CATEGORIES: VehicleCategory[] = [
  'Loader Rickshaw',
  'Milk Van',
  'Truck',
  'Other',
];

export const AddDriverEntryForm: React.FC<AddDriverEntryFormProps> = ({
  driver,
  onBack,
  onSaved,
}) => {
  const { addDriverEntry } = useKantaData();
  const { shopName, ownerName } = useAuth();

  // Fields
  const [date, setDate] = useState<string>(getTodayDateString());
  const [vehicleCategory, setVehicleCategory] = useState<VehicleCategory>(
    driver.vehicleCategory || 'Loader Rickshaw'
  );
  const [vehicleReg, setVehicleReg] = useState<string>(driver.vehicleReg || '');
  const [firstWeight, setFirstWeight] = useState<string>('');
  const [secondWeight, setSecondWeight] = useState<string>('');
  const [thirdWeight, setThirdWeight] = useState<string>('');
  const [totalPrice, setTotalPrice] = useState<string>('');
  const [receivedPrice, setReceivedPrice] = useState<string>('0');
  const [confirmAdvance, setConfirmAdvance] = useState<boolean>(false);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Post-save state
  const [savedRecord, setSavedRecord] = useState<KantaEntry | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [pdfFeedback, setPdfFeedback] = useState<{
    filename: string;
    location: string;
    blob: Blob | null;
    canShare: boolean;
  } | null>(null);

  // Calculate automatically: Due Price = Total Price - Received Price
  const numTotal = Number(totalPrice) || 0;
  const numReceived = Number(receivedPrice) || 0;
  const rawDue = numTotal - numReceived;
  const duePrice = rawDue < 0 ? 0 : rawDue;
  const isAdvance = numReceived > numTotal && numTotal > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (numTotal < 0) {
      setError('Total Price cannot be negative.');
      return;
    }
    if (numReceived < 0) {
      setError('Received Price cannot be negative.');
      return;
    }

    if (isAdvance && !confirmAdvance) {
      setError(
        `Received amount (Rs. ${numReceived}) is higher than Total Price (Rs. ${numTotal}). Please confirm advance payment below before saving.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const entry = await addDriverEntry(driver.id, {
        date,
        vehicleCategory,
        vehicleReg: vehicleReg.trim() || undefined,
        firstWeight: firstWeight !== '' ? Number(firstWeight) : '',
        secondWeight: secondWeight !== '' ? Number(secondWeight) : '',
        thirdWeight: thirdWeight !== '' ? Number(thirdWeight) : '',
        totalPrice: numTotal,
        receivedPrice: numReceived,
        duePrice,
      });

      // Show post-save screen with PDF Download button
      setSavedRecord(entry);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save entry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadPdf = async (entry: KantaEntry) => {
    if (isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    setError(null);

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
        });
      } else {
        setError(result.error || 'Failed to download PDF.');
      }
    } catch (err) {
      console.error('PDF error:', err);
      setError('Failed to generate PDF document.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const resetFormForAnother = () => {
    setSavedRecord(null);
    setFirstWeight('');
    setSecondWeight('');
    setThirdWeight('');
    setTotalPrice('');
    setReceivedPrice('0');
    setConfirmAdvance(false);
    setError(null);
  };

  // If entry was just saved, render the Post-Save Screen with the PDF download button!
  if (savedRecord) {
    const num1 = savedRecord.firstWeight !== '' ? Number(savedRecord.firstWeight) : 0;
    const num2 = savedRecord.secondWeight !== '' ? Number(savedRecord.secondWeight) : 0;
    const netWeight = num1 > 0 && num2 > 0 ? Math.abs(num1 - num2) : 0;
    const maunds = (netWeight / 40).toFixed(2);

    return (
      <div className="space-y-4 max-w-xl mx-auto">
        {/* Top Header */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <button
            onClick={onSaved}
            className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-700 hover:text-blue-700 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go to {driver.name}'s Khata</span>
          </button>
          <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Saved</span>
          </span>
        </div>

        {/* Success Announcement Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              Weight Record Saved Successfully!
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Record is stored in <strong>{driver.name}'s</strong> ledger and synced to database.
            </p>
          </div>

          {/* Record Details Summary */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 text-left space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500 font-semibold">Slip Reference</span>
              <span className="font-mono font-bold text-blue-900">
                HK-{(savedRecord.id || '').substring(savedRecord.id.length - 6).toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-slate-700">
              <div>
                <span className="text-slate-400 block text-[11px]">Driver Name</span>
                <span className="font-bold text-slate-900">{driver.name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Vehicle Reg / Category</span>
                <span className="font-bold text-slate-900">
                  {savedRecord.vehicleReg || 'N/A'} ({savedRecord.vehicleCategory})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Date</span>
                <span className="font-semibold text-slate-800">{formatDate(savedRecord.date)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Net Weight (صافی وزن)</span>
                <span className="font-black text-blue-900">
                  {netWeight > 0 ? `${netWeight.toLocaleString()} kg (${maunds} M)` : '---'}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-slate-400 block text-[11px]">Kanta Fee</span>
                <span className="font-bold text-slate-900">{formatPKR(savedRecord.totalPrice)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Received</span>
                <span className="font-bold text-emerald-700">{formatPKR(savedRecord.receivedPrice)}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block text-[11px]">Due Balance</span>
                <span className={`font-black ${savedRecord.duePrice > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                  {formatPKR(savedRecord.duePrice)}
                </span>
              </div>
            </div>
          </div>

          {/* PDF Download Section */}
          <div className="space-y-3 pt-2">
            <button
              onClick={() => handleDownloadPdf(savedRecord)}
              disabled={isGeneratingPdf}
              className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-60 text-white font-black text-sm sm:text-base rounded-2xl shadow-lg transition cursor-pointer flex items-center justify-center gap-2.5"
            >
              <Download className="w-5 h-5" />
              <span>{isGeneratingPdf ? 'Generating PDF Slip...' : 'Download PDF Slip (وزن پرچی ڈاؤنلوڈ)'}</span>
            </button>
            <p className="text-[11px] text-slate-500">
              Saves the official 100-Ton weighbridge slip directly to your phone's <strong>Downloads</strong> folder.
            </p>
          </div>

          {/* Navigation Buttons */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-2.5">
            <button
              onClick={resetFormForAnother}
              className="w-full sm:flex-1 py-3 px-4 border-2 border-blue-600 text-blue-700 font-bold rounded-xl hover:bg-blue-50 transition cursor-pointer text-xs flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Another Entry</span>
            </button>
            <button
              onClick={onSaved}
              className="w-full sm:flex-1 py-3 px-4 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl shadow-md transition cursor-pointer text-xs"
            >
              Go to {driver.name}'s Khata
            </button>
          </div>
        </div>

        {/* PDF Download Feedback / Share Modal */}
        <PdfDownloadFeedbackModal
          isOpen={Boolean(pdfFeedback)}
          onClose={() => setPdfFeedback(null)}
          filename={pdfFeedback?.filename || ''}
          location={pdfFeedback?.location || ''}
          blob={pdfFeedback?.blob || null}
          canShare={pdfFeedback?.canShare || false}
          title={`Hamza Kanta Slip - ${driver.name}`}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Top Breadcrumb Header */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-700 hover:text-blue-700 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to {driver.name}'s Khata</span>
        </button>
        <span className="text-xs bg-blue-50 text-blue-800 font-bold px-2.5 py-1 rounded-md">
          New Vehicle Weight Entry
        </span>
      </div>

      {/* Main Form Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-blue-700 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Scale className="w-6 h-6 text-blue-200" />
            <div>
              <h1 className="font-black text-base sm:text-lg">
                Weight Entry for {driver.name}
              </h1>
              <p className="text-xs text-blue-200">
                Hamza Computerized Kanta • 100-Ton Scale
              </p>
            </div>
          </div>
          <span className="text-xs bg-blue-800 font-mono px-2 py-1 rounded text-blue-100">
            {driver.vehicleReg || 'No Reg'}
          </span>
        </div>

        {error && (
          <div className="m-5 p-3.5 bg-rose-50 border border-rose-300 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs sm:text-sm">
          {/* Driver Name (Strictly Linked, Non-Editable) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Driver (Strictly Linked)</span>
            </label>
            <input
              type="text"
              readOnly
              value={driver.name}
              className="w-full text-sm font-bold bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-700 cursor-not-allowed"
            />
            <p className="text-[11px] text-slate-400 mt-0.5">
              This entry will strictly be recorded into {driver.name}'s independent khata.
            </p>
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-700" />
              <span>Date of Weight Entry <span className="text-rose-500">*</span></span>
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full text-sm font-semibold border border-slate-300 rounded-xl px-3.5 py-2.5 focus:border-blue-600 focus:outline-none bg-white"
            />
          </div>

          {/* Vehicle Category & Registration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-blue-700" />
                <span>Vehicle Category <span className="text-rose-500">*</span></span>
              </label>
              <select
                value={vehicleCategory}
                onChange={(e) => setVehicleCategory(e.target.value as VehicleCategory)}
                className="w-full text-sm font-semibold border border-slate-300 rounded-xl px-3 py-2.5 focus:border-blue-600 focus:outline-none bg-white cursor-pointer"
              >
                {VEHICLE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Vehicle Registration #
              </label>
              <input
                type="text"
                placeholder="e.g. LHR-7892, KHI-1234"
                value={vehicleReg}
                onChange={(e) => setVehicleReg(e.target.value)}
                className="w-full text-sm font-mono font-bold uppercase border border-slate-300 rounded-xl px-3.5 py-2.5 focus:border-blue-600 focus:outline-none bg-white"
              />
            </div>
          </div>

          {/* Manually Entered Weights: First, Second, Third */}
          <div>
            <span className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Vehicle Weights (Manual Values in KG)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  1st Weight (Gross)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 14250"
                  value={firstWeight}
                  onChange={(e) => setFirstWeight(e.target.value)}
                  className="w-full text-sm font-semibold border border-slate-300 rounded-xl px-3 py-2.5 text-center focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  2nd Weight (Tare)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 8100"
                  value={secondWeight}
                  onChange={(e) => setSecondWeight(e.target.value)}
                  className="w-full text-sm font-semibold border border-slate-300 rounded-xl px-3 py-2.5 text-center focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  3rd Weight (Optional)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 6150"
                  value={thirdWeight}
                  onChange={(e) => setThirdWeight(e.target.value)}
                  className="w-full text-sm font-semibold border border-slate-300 rounded-xl px-3 py-2.5 text-center focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Pricing: Total, Received, Due */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Total Price (PKR) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-500">Rs.</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    placeholder="0"
                    value={totalPrice}
                    onChange={(e) => setTotalPrice(e.target.value)}
                    className="w-full text-sm font-black pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl focus:border-blue-600 focus:outline-none bg-white text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-800 mb-1">
                  Received Price (PKR)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-emerald-700">Rs.</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={receivedPrice}
                    onChange={(e) => setReceivedPrice(e.target.value)}
                    className="w-full text-sm font-black pl-9 pr-3 py-2.5 border border-emerald-400 rounded-xl focus:border-emerald-600 focus:outline-none bg-white text-emerald-950"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-rose-700 mb-1">
                  Due Price (PKR)
                </label>
                <div className="w-full text-sm font-black px-3.5 py-2.5 border border-rose-300 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-between">
                  <span>Rs. {duePrice.toLocaleString('en-PK')}</span>
                  <span className="text-[10px] uppercase font-bold text-rose-600">
                    {duePrice > 0 ? 'Baqi' : 'Clear'}
                  </span>
                </div>
              </div>
            </div>

            {isAdvance && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span>Advance Payment Alert</span>
                </div>
                <p>
                  Received (Rs. {numReceived}) exceeds Total (Rs. {numTotal}) by Rs. {(numReceived - numTotal).toLocaleString('en-PK')}.
                </p>
                <label className="flex items-center gap-2 cursor-pointer font-bold pt-1">
                  <input
                    type="checkbox"
                    checked={confirmAdvance}
                    onChange={(e) => setConfirmAdvance(e.target.checked)}
                    className="rounded text-blue-600 w-4 h-4"
                  />
                  <span>Confirm Advance Payment</span>
                </label>
              </div>
            )}
          </div>

          {/* Large Save Entry Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-700 hover:bg-blue-800 active:bg-blue-900 disabled:opacity-60 text-white font-black text-sm sm:text-base py-3.5 px-6 rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <span>Saving under {driver.name}...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Save Entry under {driver.name}'s Khata</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
