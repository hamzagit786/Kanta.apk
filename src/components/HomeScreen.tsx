import React, { useMemo } from 'react';
import { 
  Users, 
  Receipt, 
  ChevronRight, 
  Scale, 
  HandCoins 
} from 'lucide-react';
import { useKantaData } from '../context/KantaDataContext';
import { useAuth } from '../context/AuthContext';
import { formatPKR } from '../lib/formatters';

interface HomeScreenProps {
  onNavigateToDrivers: () => void;
  onNavigateToPersonal: () => void;
  onNavigateToExpenses: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigateToDrivers,
  onNavigateToPersonal,
  onNavigateToExpenses,
}) => {
  const { shopName, ownerName } = useAuth();
  const { drivers, entries, expenses, personalPeople } = useKantaData();

  // Summary stats for the quick top strip calculated from real records
  const totalDueAcrossDrivers = useMemo(() => {
    return entries.reduce((sum, e) => sum + (Number(e.duePrice) || 0), 0);
  }, [entries]);

  const totalOtherExpenses = useMemo(() => {
    return expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [expenses]);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Business Branding Banner */}
      <div className="bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-900/60 border border-blue-400/30 text-blue-200 text-xs font-semibold">
            <Scale className="w-3.5 h-3.5 text-blue-300" />
            <span>100-Ton Computerized Scale</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            {shopName || 'Hamza Computerized Kanta'}
          </h2>
          <p className="text-xs sm:text-sm text-blue-100 max-w-md">
            Owner: <strong>{ownerName || 'Hamza Siddique'}</strong> • Phone: 03257833708
          </p>
        </div>

        {/* Quick 2-stat bottom bar */}
        <div className="mt-5 pt-4 border-t border-blue-600/40 grid grid-cols-2 gap-3 relative z-10 text-xs">
          <div>
            <span className="text-blue-200 text-[11px] block font-medium">Total Drivers Outstanding</span>
            <span className="text-lg sm:text-xl font-black text-rose-300">
              {formatPKR(totalDueAcrossDrivers)}
            </span>
          </div>
          <div>
            <span className="text-blue-200 text-[11px] block font-medium">Other Expenses</span>
            <span className="text-lg sm:text-xl font-black text-white">
              {formatPKR(totalOtherExpenses)}
            </span>
          </div>
        </div>

        {/* Decorative background shape */}
        <div className="absolute -right-8 -bottom-8 w-44 h-44 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* The THREE Main Functional Business Options */}
      <div className="space-y-3.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
          Select an Option (ایک آپشن منتخب کریں)
        </h3>

        {/* 1. Drivers */}
        <button
          onClick={onNavigateToDrivers}
          className="w-full text-left bg-white hover:bg-blue-50/60 active:bg-blue-100/50 border-2 border-slate-200 hover:border-blue-500 rounded-2xl p-5 shadow-sm transition-all duration-200 cursor-pointer group flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-blue-700 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
              <Users className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg sm:text-xl font-black text-slate-900 group-hover:text-blue-700 transition-colors">
                  1. Drivers
                </span>
                <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full">
                  {drivers.length} Driver{drivers.length === 1 ? '' : 's'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Manage independent driver accounts, view vehicle weight records, and track due balances.
              </p>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-blue-700 group-hover:text-white text-slate-600 flex items-center justify-center shrink-0 transition-colors">
            <ChevronRight className="w-5 h-5" />
          </div>
        </button>

        {/* 2. Personal Data */}
        <button
          onClick={onNavigateToPersonal}
          className="w-full text-left bg-white hover:bg-blue-50/60 active:bg-blue-100/50 border-2 border-slate-200 hover:border-blue-500 rounded-2xl p-5 shadow-sm transition-all duration-200 cursor-pointer group flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-slate-800 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
              <HandCoins className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg sm:text-xl font-black text-slate-900 group-hover:text-blue-700 transition-colors">
                  2. Personal Data
                </span>
                <span className="text-xs font-bold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full">
                  {personalPeople.length} {personalPeople.length === 1 ? 'Person' : 'People'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Loan & Udhar accounts for money borrowed and lent, repayments, and balance tracking.
              </p>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-blue-700 group-hover:text-white text-slate-600 flex items-center justify-center shrink-0 transition-colors">
            <ChevronRight className="w-5 h-5" />
          </div>
        </button>

        {/* 3. Other Expenses */}
        <button
          onClick={onNavigateToExpenses}
          className="w-full text-left bg-white hover:bg-rose-50/60 active:bg-rose-100/50 border-2 border-slate-200 hover:border-rose-400 rounded-2xl p-5 shadow-sm transition-all duration-200 cursor-pointer group flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
              <Receipt className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg sm:text-xl font-black text-slate-900 group-hover:text-rose-700 transition-colors">
                  3. Other Expenses
                </span>
                <span className="text-xs font-bold bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded-full">
                  {expenses.length} Records
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Record and monitor shop & scale operational expenses: electricity, computer repairs, tea, and rent.
              </p>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-rose-600 group-hover:text-white text-slate-600 flex items-center justify-center shrink-0 transition-colors">
            <ChevronRight className="w-5 h-5" />
          </div>
        </button>
      </div>
    </div>
  );
};
