import React, { useState } from 'react';
import { X, User, Phone, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useKantaData } from '../../context/KantaDataContext';

interface AddPersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (personId: string) => void;
}

export const AddPersonModal: React.FC<AddPersonModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { addPersonalPerson } = useKantaData();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Person Name is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await addPersonalPerson({
        name: name.trim(),
        phone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      setName('');
      setPhone('');
      setNotes('');
      onSuccess(created.id);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add person.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        <div className="bg-blue-700 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-blue-200" />
            <h3 className="font-bold text-base sm:text-lg">Add New Person (شخص شامل کریں)</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-blue-200 hover:text-white hover:bg-blue-600 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs sm:text-sm">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2 text-xs font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Person Name (Required) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Person Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Haji Bashir, Tariq Butt, Imran"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-sm font-semibold border border-slate-300 rounded-xl px-3.5 py-2.5 focus:border-blue-600 focus:outline-none"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Enter the name of the person from whom you borrow or lend money.
            </p>
          </div>

          {/* Phone Number (Optional) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-blue-700" />
              <span>Phone Number (Optional)</span>
            </label>
            <input
              type="tel"
              placeholder="e.g. 0300-1234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 focus:border-blue-600 focus:outline-none"
            />
          </div>

          {/* Notes (Optional) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-700" />
              <span>Notes / Details (Optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Shop neighbor, brother, fuel supplier"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 focus:border-blue-600 focus:outline-none"
            />
          </div>

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
              <span>Save Person</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
