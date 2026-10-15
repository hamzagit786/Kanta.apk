import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Search, 
  Plus, 
  User, 
  Truck, 
  Phone, 
  Trash2, 
  ChevronRight,
  AlertTriangle,
  UserPlus
} from 'lucide-react';
import { Driver } from '../types';
import { useKantaData } from '../context/KantaDataContext';
import { AddDriverModal } from './AddDriverModal';

interface DriversSectionProps {
  onBack: () => void;
  onSelectDriver: (driver: Driver) => void;
}

export const DriversSection: React.FC<DriversSectionProps> = ({
  onBack,
  onSelectDriver,
}) => {
  const { drivers, deleteDriver } = useKantaData();

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [driverToDelete, setDriverToDelete] = useState<Driver | null>(null);

  // Filter list containing only driver names matching search
  const filteredDrivers = drivers.filter((d) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const confirmDelete = async () => {
    if (!driverToDelete) return;
    try {
      await deleteDriver(driverToDelete.id);
      setDriverToDelete(null);
    } catch (err) {
      console.error(err);
      alert('Failed to delete driver.');
    }
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Top Header */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-700 hover:text-blue-700 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Home</span>
        </button>
        <h2 className="text-sm sm:text-base font-bold text-slate-900">
          Drivers (ڈرائیورز)
        </h2>
        {drivers.length > 0 && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Driver</span>
          </button>
        )}
      </div>

      {/* Empty State when no drivers exist yet (Exact requirement) */}
      {drivers.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 sm:p-12 text-center space-y-4">
          <div className="w-14 h-14 bg-blue-50 text-blue-700 rounded-2xl flex items-center justify-center mx-auto">
            <UserPlus className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900">
              No Drivers Added Yet
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Add your first driver to start keeping their khata.
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-6 py-3 bg-blue-700 hover:bg-blue-800 text-white font-bold text-sm rounded-xl shadow-md transition cursor-pointer inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add First Driver</span>
          </button>
        </div>
      ) : (
        /* Drivers List containing only driver names */
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
          {/* Search Box & Add New Driver Button */}
          <div className="flex items-center gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search driver by name..."
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
              <span className="hidden sm:inline">+ Add New Driver</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>

          {/* List of Driver Names */}
          <div className="divide-y divide-slate-100">
            {filteredDrivers.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No driver found matching "{searchQuery}".
              </div>
            ) : (
              filteredDrivers.map((driver) => (
                <div
                  key={driver.id}
                  className="py-3 px-2 flex items-center justify-between hover:bg-slate-50 rounded-xl transition group"
                >
                  {/* Clickable driver name to open Hamza's khata */}
                  <button
                    onClick={() => onSelectDriver(driver)}
                    className="flex-1 text-left flex items-center gap-3 cursor-pointer py-1"
                  >
                    <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-800 font-black text-sm flex items-center justify-center">
                      {driver.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 text-sm sm:text-base group-hover:text-blue-700 transition">
                        {driver.name}
                      </span>
                      {driver.vehicleReg && (
                        <span className="font-mono text-[11px] text-slate-500 block">
                          {driver.vehicleReg} {driver.vehicleCategory ? `• ${driver.vehicleCategory}` : ''}
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelectDriver(driver)}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1"
                    >
                      <span>Open Khata</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDriverToDelete(driver)}
                      title="Delete Driver"
                      className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Add Driver Modal */}
      <AddDriverModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={(newId) => {
          const created = drivers.find((d) => d.id === newId);
          if (created) onSelectDriver(created);
        }}
      />

      {/* Delete Driver Confirmation */}
      {driverToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base text-center">
              Delete Driver Account?
            </h3>
            <p className="text-xs text-slate-600 text-center mt-1.5">
              Are you sure you want to delete <strong>{driverToDelete.name}</strong> and all their vehicle weight khata records?
            </p>
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setDriverToDelete(null)}
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
    </div>
  );
};
