import React, { useState } from 'react';
import { X, CheckCircle2, AlertTriangle, Building2, User, Phone, MapPin, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useKantaData } from '../../context/KantaDataContext';

interface ShopProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShopProfileModal: React.FC<ShopProfileModalProps> = ({ isOpen, onClose }) => {
  const { shopName, ownerName, saveUserProfile } = useAuth();
  const { personalData, updatePersonalData } = useKantaData();

  const [shop, setShop] = useState(shopName || personalData.shopName || personalData.kantaName || 'Hamza Computerized Kanta');
  const [owner, setOwner] = useState(ownerName || personalData.ownerName || 'Hamza Siddique');
  const [phone, setPhone] = useState(personalData.phone || '03257833708');
  const [address, setAddress] = useState(personalData.address || 'Main G.T. Road, Pakistan');
  const [notes, setNotes] = useState(personalData.notes || '100-Ton Computerized Scale');

  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSavedSuccess(false);

    if (!shop.trim()) {
      setError('Shop Name is mandatory.');
      return;
    }
    if (!owner.trim()) {
      setError("Owner's Name is required.");
      return;
    }

    setIsSaving(true);
    try {
      await saveUserProfile(owner.trim(), shop.trim());
      await updatePersonalData({
        ownerName: owner.trim(),
        shopName: shop.trim(),
        kantaName: shop.trim(),
        phone: phone.trim(),
        address: address.trim(),
        notes: notes.trim(),
      });

      setSavedSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        <div className="bg-blue-700 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-200" />
            <h3 className="font-bold text-base sm:text-lg">Shop & Owner Profile</h3>
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

          {savedSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl flex items-center gap-2 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Shop details updated successfully!</span>
            </div>
          )}

          {/* Shop Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-700" />
              <span>Shop Name (App Heading) <span className="text-rose-500">*</span></span>
            </label>
            <input
              type="text"
              required
              value={shop}
              onChange={(e) => setShop(e.target.value)}
              className="w-full text-sm font-bold border border-slate-300 rounded-xl px-3.5 py-2.5 focus:border-blue-600 focus:outline-none"
            />
          </div>

          {/* Owner Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-700" />
              <span>Owner's Name <span className="text-rose-500">*</span></span>
            </label>
            <input
              type="text"
              required
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              className="w-full text-sm font-semibold border border-slate-300 rounded-xl px-3.5 py-2.5 focus:border-blue-600 focus:outline-none"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-blue-700" />
              <span>Phone Number</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 focus:border-blue-600 focus:outline-none"
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-700" />
              <span>Address / Location</span>
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 focus:border-blue-600 focus:outline-none"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-700" />
              <span>Notes / Capacity</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 border border-slate-300 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold cursor-pointer transition flex items-center gap-1.5 text-xs shadow-md"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Profile'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
