import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export const ProfileSetupModal: React.FC = () => {
  const { user, ownerName: defaultOwner, saveUserProfile } = useAuth();

  const [owner, setOwner] = useState(defaultOwner || user?.displayName || '');
  const [shop, setShop] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!shop.trim()) {
      setError('Shop Name is mandatory.');
      return;
    }
    if (!owner.trim()) {
      setError("Owner's Name is required.");
      return;
    }

    setSubmitting(true);
    try {
      await saveUserProfile(owner.trim(), shop.trim());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save shop details.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white max-w-md w-full rounded-2xl p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5">
        <div>
          <h2 className="text-xl font-black text-slate-900">
            Complete Your Shop Profile
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Please enter your Shop Name to complete registration. This name will appear on all pages and ledgers.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Owner's Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={owner}
              placeholder="e.g. Hamza Siddique"
              onChange={(e) => setOwner(e.target.value)}
              className="w-full text-sm font-semibold border border-slate-300 rounded-xl px-3.5 py-2.5 focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Shop Name (App Heading) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={shop}
              placeholder="e.g. Hamza Computerized Kanta"
              onChange={(e) => setShop(e.target.value)}
              className="w-full text-sm font-bold border border-slate-300 rounded-xl px-3.5 py-2.5 focus:border-blue-600 focus:outline-none"
            />
            <p className="text-[11px] text-slate-500 mt-0.5">
              This field is mandatory and sets the name of your business.
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-700 hover:bg-blue-800 text-white font-black py-3 px-4 rounded-xl shadow-md transition cursor-pointer text-sm"
          >
            {submitting ? 'Saving...' : 'Save & Enter Application'}
          </button>
        </form>
      </div>
    </div>
  );
};
