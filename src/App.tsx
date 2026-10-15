import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { KantaDataProvider, useKantaData } from './context/KantaDataContext';
import { Driver } from './types';
import { AuthScreen } from './components/auth/AuthScreen';
import { ProfileSetupModal } from './components/auth/ProfileSetupModal';
import { HomeScreen } from './components/HomeScreen';
import { DriversSection } from './components/DriversSection';
import { DriverKhataView } from './components/DriverKhataView';
import { AddDriverEntryForm } from './components/AddDriverEntryForm';
import { PersonalDataSection } from './components/PersonalDataSection';
import { OtherExpensesSection } from './components/OtherExpensesSection';
import { 
  Scale, 
  LogOut, 
  ShieldCheck, 
  Home, 
  ChevronRight 
} from 'lucide-react';

type ActiveView = 
  | 'home' 
  | 'drivers' 
  | 'driver_khata' 
  | 'add_driver_entry' 
  | 'personal_data' 
  | 'other_expenses';

function KantaApp() {
  const { user, loading: authLoading, shopName, ownerName, needsProfileSetup, logout } = useAuth();
  const { drivers, loading: dataLoading } = useKantaData();

  const [activeView, setActiveView] = useState<ActiveView>('home');
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

  // Android hardware/gesture back-button navigation support
  React.useEffect(() => {
    let removeListener: (() => void) | null = null;
    try {
      import('@capacitor/app').then(({ App: CapApp }) => {
        CapApp.addListener('backButton', () => {
          setActiveView((prev) => {
            if (prev === 'add_driver_entry') return 'driver_khata';
            if (prev === 'driver_khata') return 'drivers';
            if (prev !== 'home') return 'home';
            CapApp.exitApp();
            return 'home';
          });
        }).then((sub) => {
          removeListener = () => sub.remove();
        });
      }).catch(() => {});
    } catch {
      // Running in standard browser
    }

    return () => {
      if (removeListener) removeListener();
    };
  }, []);

  // If auth is still checking
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col justify-between items-center font-sans">
        <div className="flex-1 flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-700 rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-slate-600">
            Checking authentication...
          </p>
        </div>
        <footer className="py-6 px-4 text-center border-t border-slate-200 bg-white w-full">
          <p className="text-xs font-medium text-slate-600">
            This app is created by Hamza Siddique
          </p>
          <p className="text-xs font-medium text-slate-600 mt-0.5">
            Phone: 03257833708
          </p>
        </footer>
      </div>
    );
  }

  // Requirement B: The user must sign in or register before accessing any app feature.
  // When an unauthenticated user opens the app, show only the authentication screen.
  if (!user) {
    return <AuthScreen />;
  }

  // Always get fresh driver reference
  const currentDriver = drivers.find((d) => d.id === selectedDriverId) || null;

  const handleSelectDriver = (driver: Driver) => {
    setSelectedDriverId(driver.id);
    setActiveView('driver_khata');
  };

  const handleGoHome = () => {
    setActiveView('home');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Mandatory Google profile completion modal if Shop Name is missing */}
      {needsProfileSetup && <ProfileSetupModal />}

      {/* Top Header with Personalized Shop Heading */}
      <header className="bg-blue-700 text-white shadow-md sticky top-0 z-30 border-b border-blue-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleGoHome}
              title="Go to Home Screen"
              className="w-10 h-10 rounded-xl bg-blue-800 border border-blue-600 flex items-center justify-center shadow-inner hover:bg-blue-900 transition cursor-pointer"
            >
              <Scale className="w-6 h-6 text-white" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleGoHome}
                  className="font-black text-lg sm:text-xl tracking-tight leading-tight text-white hover:text-blue-100 transition text-left cursor-pointer"
                >
                  {shopName || 'Hamza Computerized Kanta'}
                </button>
              </div>
              <p className="text-[11px] text-blue-200">
                100-Ton Computerized Scale • Owner: <strong>{ownerName || user.displayName || 'Hamza Siddique'}</strong>
              </p>
            </div>
          </div>

          {/* Quick Breadcrumb/Navigation & User Sign-Out */}
          <div className="flex items-center gap-2">
            {activeView !== 'home' && (
              <button
                onClick={handleGoHome}
                className="hidden sm:flex items-center gap-1 text-xs bg-blue-800/80 hover:bg-blue-800 border border-blue-600 px-2.5 py-1.5 rounded-lg text-blue-100 font-bold transition cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Home</span>
              </button>
            )}

            <div className="flex items-center gap-2">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-bold text-white flex items-center justify-end gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                  {ownerName || user.displayName || 'Owner'}
                </span>
                <span className="text-[10px] text-blue-200 truncate max-w-[120px]">
                  {user.email}
                </span>
              </div>
              <button
                onClick={logout}
                title="Sign Out"
                className="p-1.5 text-blue-200 hover:text-white hover:bg-blue-800 rounded-lg transition cursor-pointer text-xs"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Breadcrumb Bar for deeper pages */}
        {activeView !== 'home' && (
          <div className="bg-blue-800/90 px-4 sm:px-6 py-1.5 text-xs text-blue-200 border-t border-blue-600/40">
            <div className="max-w-4xl mx-auto flex items-center gap-1.5">
              <button
                onClick={handleGoHome}
                className="hover:text-white transition flex items-center gap-1 cursor-pointer"
              >
                <Home className="w-3 h-3" />
                <span>Home</span>
              </button>
              <ChevronRight className="w-3 h-3 text-blue-400" />

              {activeView === 'drivers' && (
                <span className="text-white font-bold">Drivers Section</span>
              )}

              {activeView === 'driver_khata' && (
                <>
                  <button
                    onClick={() => setActiveView('drivers')}
                    className="hover:text-white transition cursor-pointer"
                  >
                    Drivers
                  </button>
                  <ChevronRight className="w-3 h-3 text-blue-400" />
                  <span className="text-white font-bold">
                    {currentDriver ? `${currentDriver.name}'s Khata` : 'Driver Khata'}
                  </span>
                </>
              )}

              {activeView === 'add_driver_entry' && (
                <>
                  <button
                    onClick={() => setActiveView('drivers')}
                    className="hover:text-white transition cursor-pointer"
                  >
                    Drivers
                  </button>
                  <ChevronRight className="w-3 h-3 text-blue-400" />
                  <button
                    onClick={() => setActiveView('driver_khata')}
                    className="hover:text-white transition cursor-pointer"
                  >
                    {currentDriver ? `${currentDriver.name}'s Khata` : 'Driver Khata'}
                  </button>
                  <ChevronRight className="w-3 h-3 text-blue-400" />
                  <span className="text-white font-bold">Add Entry</span>
                </>
              )}

              {activeView === 'personal_data' && (
                <span className="text-white font-bold">Personal Data (Loan & Udhar)</span>
              )}

              {activeView === 'other_expenses' && (
                <span className="text-white font-bold">Other Expenses</span>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6">
        {dataLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-3">
            <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-700 rounded-full animate-spin"></div>
            <p className="text-xs font-semibold text-slate-500">
              Loading {shopName || 'business'} data...
            </p>
          </div>
        ) : (
          <>
            {/* View 1: Home Screen with exactly 3 main options */}
            {activeView === 'home' && (
              <HomeScreen
                onNavigateToDrivers={() => setActiveView('drivers')}
                onNavigateToPersonal={() => setActiveView('personal_data')}
                onNavigateToExpenses={() => setActiveView('other_expenses')}
              />
            )}

            {/* View 2: Drivers Section */}
            {activeView === 'drivers' && (
              <DriversSection
                onBack={handleGoHome}
                onSelectDriver={handleSelectDriver}
              />
            )}

            {/* View 3: Opening a Driver's Dedicated Khata */}
            {activeView === 'driver_khata' && currentDriver && (
              <DriverKhataView
                driver={currentDriver}
                onBack={() => setActiveView('drivers')}
                onOpenAddEntry={() => setActiveView('add_driver_entry')}
              />
            )}

            {/* View 4: Add New Vehicle Weight Entry for selected driver */}
            {activeView === 'add_driver_entry' && currentDriver && (
              <AddDriverEntryForm
                driver={currentDriver}
                onBack={() => setActiveView('driver_khata')}
                onSaved={() => setActiveView('driver_khata')}
              />
            )}

            {/* View 5: Personal Data Section */}
            {activeView === 'personal_data' && (
              <PersonalDataSection onBack={handleGoHome} />
            )}

            {/* View 6: Other Expenses Section */}
            {activeView === 'other_expenses' && (
              <OtherExpensesSection onBack={handleGoHome} />
            )}
          </>
        )}
      </main>

      {/* Requirement F: Creator Credit on Every Page (Exact requirement) */}
      <footer className="py-6 px-4 text-center border-t border-slate-200 bg-white">
        <p className="text-xs font-medium text-slate-600">
          This app is created by Hamza Siddique
        </p>
        <p className="text-xs font-medium text-slate-600 mt-0.5">
          Phone: 03257833708
        </p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <KantaDataProvider>
        <KantaApp />
      </KantaDataProvider>
    </AuthProvider>
  );
}
