import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertTriangle, Scale, Download } from 'lucide-react';
import { KantaEntry, VehicleCategory } from '../types';
import { useKantaData } from '../context/KantaDataContext';
import { useAuth } from '../context/AuthContext';
import { generateWeightSlipPdf, savePdfToDevice } from '../lib/pdfGenerator';
import { PdfDownloadFeedbackModal } from './common/PdfDownloadFeedbackModal';

interface EditRecordModalProps {
  record: KantaEntry | null;
  isOpen: boolean;
  onClose: () => void;
}

const VEHICLE_CATEGORIES: VehicleCategory[] = [
  'Loader Rickshaw',
  'Milk Van',
  'Truck',
  'Other',
];

export const EditRecordModal: React.FC<EditRecordModalProps> = ({
  record,
  isOpen,
  onClose,
}) => {
  const { updateEntry, drivers } = useKantaData();
  const { shopName, ownerName } = useAuth();

  const [date, setDate] = useState('');
  const [vehicleCategory, setVehicleCategory] = useState<VehicleCategory>('Loader Rickshaw');
  const [vehicleReg, setVehicleReg] = useState('');
  const [firstWeight, setFirstWeight] = useState<string>('');
  const [secondWeight, setSecondWeight] = useState<string>('');
  const [thirdWeight, setThirdWeight] = useState<string>('');
  const [totalPrice, setTotalPrice] = useState<string>('');
  const [receivedPrice, setReceivedPrice] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfFeedback, setPdfFeedback] = useState<{
    filename: string;
    location: string;
    blob: Blob | null;
    canShare: boolean;
  } | null>(null);

  const handleDownloadPdf = async () => {
    if (!record || isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    setError(null);
    try {
      const driver = drivers.find((d) => d.id === record.driverId) || null;
      const currentEntry: KantaEntry = {
        ...record,
        date,
        vehicleCategory,
        vehicleReg: vehicleReg.trim().toUpperCase() || undefined,
        firstWeight: firstWeight !== '' ? Number(firstWeight) : '',
        secondWeight: secondWeight !== '' ? Number(secondWeight) : '',
        thirdWeight: thirdWeight !== '' ? Number(thirdWeight) : '',
        totalPrice: numTotal,
        receivedPrice: numReceived,
        duePrice,
      };

      const doc = generateWeightSlipPdf(
        currentEntry,
        driver,
        shopName || 'Hamza Computerized Kanta',
        ownerName || 'Hamza Siddique',
        '03257833708'
      );

      const slipId = (record.id || '0000').substring(record.id.length - 6).toUpperCase();
      const cleanDate = date || new Date().toISOString().split('T')[0];
      const filename = `Record_${cleanDate}_Slip_${slipId}.pdf`;

      const result = await savePdfToDevice(doc, filename, `Weight Slip - ${record.driverName}`);
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
      console.error(err);
      setError('Could not generate PDF document.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  useEffect(() => {
    if (record) {
      setDate(record.date);
      setVehicleCategory(record.vehicleCategory);
      setVehicleReg(record.vehicleReg || '');
      setFirstWeight(record.firstWeight !== '' ? String(record.firstWeight) : '');
      setSecondWeight(record.secondWeight !== '' ? String(record.secondWeight) : '');
      setThirdWeight(record.thirdWeight !== '' ? String(record.thirdWeight) : '');
      setTotalPrice(String(record.totalPrice));
      setReceivedPrice(String(record.receivedPrice));
      setError(null);
    }
  }, [record, isOpen]);

  if (!isOpen || !record) return null;

  const numTotal = Number(totalPrice) || 0;
  const numReceived = Number(receivedPrice) || 0;
  const duePrice = Math.max(0, numTotal - numReceived);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    setIsSubmitting(true);
    try {
      await updateEntry(record.id, {
        date,
        vehicleCategory,
        vehicleReg: vehicleReg.trim().toUpperCase() || undefined,
        firstWeight: firstWeight !== '' ? Number(firstWeight) : '',
        secondWeight: secondWeight !== '' ? Number(secondWeight) : '',
        thirdWeight: thirdWeight !== '' ? Number(thirdWeight) : '',
        totalPrice: numTotal,
        receivedPrice: numReceived,
        duePrice,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        <div className="bg-blue-700 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-blue-200" />
            <div>
              <h3 className="font-bold text-base sm:text-lg">Correct Vehicle Weight Record</h3>
              <p className="text-[11px] text-blue-200">Khata: {record.driverName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-blue-200 hover:text-white hover:bg-blue-600 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs sm:text-sm">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Date & Driver Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full font-semibold border border-slate-300 rounded-xl px-3 py-2 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Driver Name (Locked)
              </label>
              <div className="w-full font-bold bg-slate-100 border border-slate-300 rounded-xl px-3 py-2 text-slate-800">
                {record.driverName}
              </div>
            </div>
          </div>

          {/* Category & Reg */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Vehicle Category
              </label>
              <select
                value={vehicleCategory}
                onChange={(e) => setVehicleCategory(e.target.value as VehicleCategory)}
                className="w-full font-semibold border border-slate-300 rounded-xl px-3 py-2 focus:border-blue-600 focus:outline-none bg-white"
              >
                {VEHICLE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Vehicle Registration # (Optional)
              </label>
              <input
                type="text"
                value={vehicleReg}
                placeholder="e.g. LES-4412"
                onChange={(e) => setVehicleReg(e.target.value.toUpperCase())}
                className="w-full font-mono font-bold uppercase border border-slate-300 rounded-xl px-3 py-2 focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Weights */}
          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                1st Weight
              </label>
              <input
                type="number"
                step="any"
                value={firstWeight}
                onChange={(e) => setFirstWeight(e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-2 text-center focus:border-blue-600 focus:outline-none font-semibold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                2nd Weight
              </label>
              <input
                type="number"
                step="any"
                value={secondWeight}
                onChange={(e) => setSecondWeight(e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-2 text-center focus:border-blue-600 focus:outline-none font-semibold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                3rd Weight
              </label>
              <input
                type="number"
                step="any"
                value={thirdWeight}
                onChange={(e) => setThirdWeight(e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-2 text-center focus:border-blue-600 focus:outline-none font-semibold"
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-3 gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Total Price (PKR)
              </label>
              <input
                type="number"
                min="0"
                value={totalPrice}
                onChange={(e) => setTotalPrice(e.target.value)}
                className="w-full font-bold border border-slate-300 rounded-xl p-2 text-center bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-emerald-800 mb-1">
                Received (PKR)
              </label>
              <input
                type="number"
                min="0"
                value={receivedPrice}
                onChange={(e) => setReceivedPrice(e.target.value)}
                className="w-full font-bold border border-emerald-400 rounded-xl p-2 text-center bg-white text-emerald-950"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-rose-700 mb-1">
                Due Price (PKR)
              </label>
              <div className="p-2 border border-rose-300 rounded-xl font-black text-rose-700 text-center bg-rose-50">
                Rs. {duePrice.toLocaleString('en-PK')}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf || isSubmitting}
              className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white rounded-xl font-bold cursor-pointer transition flex items-center justify-center gap-1.5 text-xs shadow-sm"
              title="Download PDF Weight Slip"
            >
              <Download className="w-4 h-4" />
              <span>{isGeneratingPdf ? 'Generating PDF...' : 'Download PDF Slip'}</span>
            </button>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
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
                disabled={isSubmitting}
                className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold cursor-pointer transition flex items-center gap-1.5 text-xs shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Corrections</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      <PdfDownloadFeedbackModal
        isOpen={Boolean(pdfFeedback)}
        onClose={() => setPdfFeedback(null)}
        filename={pdfFeedback?.filename || ''}
        location={pdfFeedback?.location || ''}
        blob={pdfFeedback?.blob || null}
        canShare={pdfFeedback?.canShare || false}
        title={`Weight Slip - ${record.driverName}`}
      />
    </div>
  );
};
