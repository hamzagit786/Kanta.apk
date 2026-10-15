import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, 
  Plus, 
  Search, 
  User, 
  Phone, 
  ChevronRight, 
  DollarSign, 
  ArrowDownLeft, 
  ArrowUpRight, 
  ShieldCheck,
  UserPlus,
  Scale
} from 'lucide-react';
import { PersonalPerson } from '../types';
import { useKantaData } from '../context/KantaDataContext';
import { useAuth } from '../context/AuthContext';
import { formatPKR } from '../lib/formatters';
import { AddPersonModal } from './personal/AddPersonModal';
import { PersonAccountView } from './personal/PersonAccountView';
import { ShopProfileModal } from './personal/ShopProfileModal';
import { Building2 } from 'lucide-react';

interface PersonalDataSectionProps {
  onBack: () => void;
}

export const PersonalDataSection: React.FC<PersonalDataSectionProps> = ({ onBack }) => {
  const { user } = useAuth();
  const { personalPeople, getPersonBalances } = useKantaData();

  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Person lookup
  const selectedPerson = personalPeople.find((p) => p.id === selectedPersonId) || null;

  // Filter people by search
  const filteredPeople = useMemo(() => {
    return personalPeople.filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      (p.phone && p.phone.includes(searchQuery.trim()))
    );
  }, [personalPeople, searchQuery]);

  // Overall totals across all people
  const overallTotals = useMemo(() => {
    let totalBorrowedRemaining = 0;
    let totalLentRemaining = 0;

    personalPeople.forEach((p) => {
      const b = getPersonBalances(p.id);
      totalBorrowedRemaining += b.remainingBorrowed;
      totalLentRemaining += b.remainingLent;
    });

    const netPosition = totalLentRemaining - totalBorrowedRemaining;

    return {
      totalBorrowedRemaining,
      totalLentRemaining,
      netPosition,
    };
  }, [personalPeople, getPersonBalances]);

  // If a specific person is selected, show their individual account
  if (selectedPerson) {
    return (
      <PersonAccountView
        person={selectedPerson}
        onBack={() => setSelectedPersonId(null)}
      />
    );
  }

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
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
            Personal Data — Loan & Udhar Accounts
          </h2>
          <span className="text-[11px] text-slate-400">
            ذاتی ادھار و قرضہ جات
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-2.5 py-1.5 rounded-xl transition cursor-pointer"
          >
            <Building2 className="w-3.5 h-3.5 text-blue-700" />
            <span className="hidden sm:inline">Shop Profile</span>
          </button>
          {personalPeople.length > 0 && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Person</span>
            </button>
          )}
        </div>
      </div>

      {/* Overall Loan Summary Card (Only when people exist) */}
      {personalPeople.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Total Money I Borrowed Remaining */}
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 block">
                  Total Borrowed (I Owe)
                </span>
                <ArrowDownLeft className="w-3.5 h-3.5 text-amber-700" />
              </div>
              <div className="text-lg sm:text-xl font-black text-amber-900 mt-0.5">
                {formatPKR(overallTotals.totalBorrowedRemaining)}
              </div>
              <span className="text-[10px] text-amber-700 mt-0.5 block">
                Total money you have to pay back
              </span>
            </div>

            {/* Total Money I Lent Remaining */}
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900 block">
                  Total Lent (Receivable)
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-700" />
              </div>
              <div className="text-lg sm:text-xl font-black text-emerald-900 mt-0.5">
                {formatPKR(overallTotals.totalLentRemaining)}
              </div>
              <span className="text-[10px] text-emerald-700 mt-0.5 block">
                Total money people owe you
              </span>
            </div>

            {/* Net Position */}
            <div className={`p-3 rounded-xl border ${
              overallTotals.netPosition > 0
                ? 'bg-emerald-100/70 border-emerald-300'
                : overallTotals.netPosition < 0
                ? 'bg-rose-100/70 border-rose-300'
                : 'bg-slate-100 border-slate-200'
            }`}>
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                overallTotals.netPosition > 0 ? 'text-emerald-900' : overallTotals.netPosition < 0 ? 'text-rose-900' : 'text-slate-600'
              }`}>
                Total Net Position
              </span>
              <div className={`text-lg sm:text-xl font-black mt-0.5 ${
                overallTotals.netPosition > 0 ? 'text-emerald-800' : overallTotals.netPosition < 0 ? 'text-rose-800' : 'text-slate-700'
              }`}>
                {formatPKR(Math.abs(overallTotals.netPosition))}
              </div>
              <span className={`text-[10px] font-semibold mt-0.5 block ${
                overallTotals.netPosition > 0 ? 'text-emerald-700' : overallTotals.netPosition < 0 ? 'text-rose-700' : 'text-slate-500'
              }`}>
                {overallTotals.netPosition > 0
                  ? 'Net to receive from people'
                  : overallTotals.netPosition < 0
                  ? 'Net you owe to people'
                  : 'All accounts balanced'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Empty State when no people exist yet (Exact requirement) */}
      {personalPeople.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 sm:p-12 text-center space-y-4">
          <div className="w-14 h-14 bg-blue-50 text-blue-700 rounded-2xl flex items-center justify-center mx-auto">
            <UserPlus className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900">
              No personal loan records yet.
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              Add people from whom you borrow money or to whom you lend money to keep independent accounts.
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-6 py-3 bg-blue-700 hover:bg-blue-800 text-white font-bold text-sm rounded-xl shadow-md transition cursor-pointer inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add New Person</span>
          </button>
        </div>
      ) : (
        /* Saved People List with Name and Remaining Balances */
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
          {/* Search Box & Add New Person Button */}
          <div className="flex items-center gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search person by name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs sm:text-sm pl-9 pr-3.5 py-2.5 border border-slate-300 rounded-xl focus:border-blue-600 focus:outline-none"
              />
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-sm transition cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">+ Add New Person</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>

          {/* List of People */}
          <div className="divide-y divide-slate-100">
            {filteredPeople.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No person found matching "{searchQuery}".
              </div>
            ) : (
              filteredPeople.map((person) => {
                const b = getPersonBalances(person.id);

                return (
                  <div
                    key={person.id}
                    className="py-3 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 rounded-xl transition group"
                  >
                    {/* Clickable Name and details */}
                    <button
                      onClick={() => setSelectedPersonId(person.id)}
                      className="flex-1 text-left flex items-center gap-3 cursor-pointer py-1"
                    >
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-800 font-black text-sm flex items-center justify-center shrink-0">
                        {person.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 text-sm sm:text-base group-hover:text-blue-700 transition">
                          {person.name}
                        </span>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          {person.phone && (
                            <span className="flex items-center gap-0.5 text-slate-600">
                              <Phone className="w-3 h-3 text-blue-600" /> {person.phone}
                            </span>
                          )}
                          {person.notes && (
                            <span className="italic truncate max-w-[150px]">
                              • {person.notes}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Remaining Balances for this person */}
                    <div className="flex items-center gap-3 justify-between sm:justify-end">
                      <div className="text-right text-xs">
                        <div className="flex items-center gap-2">
                          {b.remainingBorrowed > 0 && (
                            <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              Borrowed: {formatPKR(b.remainingBorrowed)}
                            </span>
                          )}
                          {b.remainingLent > 0 && (
                            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              Lent: {formatPKR(b.remainingLent)}
                            </span>
                          )}
                          {b.remainingBorrowed === 0 && b.remainingLent === 0 && (
                            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              Settled (Rs. 0)
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => setSelectedPersonId(person.id)}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        <span>Open Account</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Add Person Modal */}
      <AddPersonModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={(newId) => {
          setSelectedPersonId(newId);
        }}
      />

      {/* Edit Shop Profile Modal */}
      <ShopProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </div>
  );
};
