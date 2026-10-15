import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { 
  Driver, 
  KantaEntry, 
  PersonalData, 
  OtherExpense, 
  VehicleCategory,
  PersonalPerson,
  PersonalLoan,
  PersonalRepayment,
  LoanType,
  RepaymentDirection,
  ExpenseCreditor,
  ExpensePayment,
  ExpensePaymentStatus
} from '../types';
import { db, logFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from './AuthContext';

export interface PersonBalanceSummary {
  totalBorrowed: number;
  totalRepaidBorrowed: number;
  remainingBorrowed: number;
  totalLent: number;
  totalRepaidLent: number;
  remainingLent: number;
  netPosition: number;
}

export interface CreditorBalanceSummary {
  totalCredit: number;
  totalPaid: number;
  remainingDue: number;
}

/**
 * Ensures any object written to Firestore contains NO `undefined` values.
 * Firestore setDoc/updateDoc/addDoc throws runtime errors on undefined values.
 * This recursively converts `undefined` to `null` so Firestore operations always succeed.
 */
export function cleanForFirestore<T extends Record<string, any>>(data: T): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) {
      result[key] = null;
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      result[key] = cleanForFirestore(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

interface KantaDataContextType {
  drivers: Driver[];
  entries: KantaEntry[];
  personalData: PersonalData;
  expenses: OtherExpense[];
  
  // Personal Data — Loan & Udhar
  personalPeople: PersonalPerson[];
  personalLoans: PersonalLoan[];
  personalRepayments: PersonalRepayment[];

  // Other Expenses — Creditors & Payments
  expenseCreditors: ExpenseCreditor[];
  expensePayments: ExpensePayment[];

  loading: boolean;
  
  // Driver methods
  addDriver: (data: {
    name: string;
    vehicleCategory?: VehicleCategory | null;
    vehicleReg?: string | null;
    phone?: string | null;
  }) => Promise<Driver>;
  updateDriver: (id: string, updates: Partial<Driver>) => Promise<void>;
  deleteDriver: (id: string) => Promise<void>;

  // Driver-specific entries methods
  getDriverEntries: (driverId: string) => KantaEntry[];
  addDriverEntry: (
    driverId: string,
    entry: {
      date: string;
      vehicleCategory: VehicleCategory;
      vehicleReg?: string;
      firstWeight: number | '';
      secondWeight: number | '';
      thirdWeight: number | '';
      totalPrice: number;
      receivedPrice: number;
      duePrice: number;
    }
  ) => Promise<KantaEntry>;
  updateEntry: (entryId: string, updates: Partial<KantaEntry>) => Promise<void>;
  deleteEntry: (entryId: string) => Promise<void>;

  // Personal Profile Data methods
  updatePersonalData: (data: Partial<PersonalData>) => Promise<void>;

  // Other Expenses methods (Cash or Credit)
  addExpense: (expense: {
    date: string;
    category: string;
    description?: string;
    amount: number;
    paymentStatus: ExpensePaymentStatus;
    creditorId?: string;
    creditorName?: string;
    initialPaid?: number;
    paymentMethod?: string;
  }) => Promise<OtherExpense>;
  deleteExpense: (id: string) => Promise<void>;

  // Expense Creditors methods
  addExpenseCreditor: (data: {
    name: string;
    phone?: string;
    notes?: string;
  }) => Promise<ExpenseCreditor>;
  updateExpenseCreditor: (id: string, updates: Partial<ExpenseCreditor>) => Promise<void>;
  deleteExpenseCreditor: (id: string) => Promise<void>;

  // Expense Payments methods
  addExpensePayment: (data: {
    expenseId: string;
    creditorId: string;
    date: string;
    amount: number;
    notes?: string;
  }) => Promise<ExpensePayment>;
  deleteExpensePayment: (id: string) => Promise<void>;

  // Selectors for Expense Creditors
  getCreditorExpenses: (creditorId: string) => OtherExpense[];
  getCreditorPayments: (creditorId: string) => ExpensePayment[];
  getExpensePayments: (expenseId: string) => ExpensePayment[];
  getCreditorBalances: (creditorId: string) => CreditorBalanceSummary;

  // Personal Loan & Udhar People methods
  addPersonalPerson: (data: {
    name: string;
    phone?: string;
    notes?: string;
  }) => Promise<PersonalPerson>;
  updatePersonalPerson: (id: string, updates: Partial<PersonalPerson>) => Promise<void>;
  deletePersonalPerson: (id: string) => Promise<void>;

  // Personal Loan Transactions methods
  addPersonalLoan: (data: {
    personId: string;
    personName: string;
    date: string;
    type: LoanType;
    amount: number;
    notes?: string;
  }) => Promise<PersonalLoan>;
  updatePersonalLoan: (id: string, updates: Partial<PersonalLoan>) => Promise<void>;
  deletePersonalLoan: (id: string) => Promise<void>;

  // Personal Repayments methods
  addPersonalRepayment: (data: {
    personId: string;
    loanId: string;
    date: string;
    direction: RepaymentDirection;
    amount: number;
    notes?: string;
  }) => Promise<PersonalRepayment>;
  deletePersonalRepayment: (id: string) => Promise<void>;

  // Selectors for Personal Loan & Udhar
  getPersonLoans: (personId: string) => PersonalLoan[];
  getPersonRepayments: (personId: string) => PersonalRepayment[];
  getLoanRepayments: (loanId: string) => PersonalRepayment[];
  getLoanRemaining: (loanId: string) => number;
  getPersonBalances: (personId: string) => PersonBalanceSummary;
}

const KantaDataContext = createContext<KantaDataContextType | undefined>(undefined);

// Legacy keys for automatic migration
const LEGACY_KEYS: Record<string, string> = {
  drivers: 'usman_kanta_drivers_v2',
  entries: 'usman_kanta_entries_v2',
  personal: 'usman_kanta_personal_v2',
  expenses: 'usman_kanta_expenses_v2',
  people: 'usman_kanta_personal_people_v1',
  loans: 'usman_kanta_personal_loans_v1',
  repayments: 'usman_kanta_personal_repayments_v1',
  creditors: 'usman_kanta_creditors_v1',
  exp_payments: 'usman_kanta_exp_payments_v1',
};

const defaultPersonalData: PersonalData = {
  ownerName: 'Hamza Siddique',
  shopName: 'Hamza Computerized Kanta',
  phone: '03257833708',
  kantaName: 'Hamza Computerized Kanta',
  address: 'Main G.T. Road, Pakistan',
  notes: '100-Ton Computerized Scale',
  updatedAt: new Date().toISOString(),
};

function getUserStorageKey(userId: string, key: string): string {
  return `kanta_${userId}_${key}`;
}

function loadUserCache<T>(userId: string, key: string, fallback: T): T {
  try {
    const userVal = localStorage.getItem(getUserStorageKey(userId, key));
    if (userVal) {
      return JSON.parse(userVal) as T;
    }
    const legacyKey = LEGACY_KEYS[key];
    if (legacyKey) {
      const legVal = localStorage.getItem(legacyKey);
      if (legVal) {
        const parsed = JSON.parse(legVal) as T;
        // Migrate to user-scoped storage
        localStorage.setItem(getUserStorageKey(userId, key), legVal);
        return parsed;
      }
    }
  } catch (err) {
    console.warn(`Error reading cache for ${key}:`, err);
  }
  return fallback;
}

function saveUserCache(userId: string, key: string, data: unknown): void {
  try {
    localStorage.setItem(getUserStorageKey(userId, key), JSON.stringify(data));
  } catch (err) {
    console.warn(`Error writing cache for ${key}:`, err);
  }
}

export const KantaDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [entries, setEntries] = useState<KantaEntry[]>([]);
  const [personalData, setPersonalData] = useState<PersonalData>(defaultPersonalData);
  const [expenses, setExpenses] = useState<OtherExpense[]>([]);
  const [personalPeople, setPersonalPeople] = useState<PersonalPerson[]>([]);
  const [personalLoans, setPersonalLoans] = useState<PersonalLoan[]>([]);
  const [personalRepayments, setPersonalRepayments] = useState<PersonalRepayment[]>([]);
  const [expenseCreditors, setExpenseCreditors] = useState<ExpenseCreditor[]>([]);
  const [expensePayments, setExpensePayments] = useState<ExpensePayment[]>([]);

  const [loading, setLoading] = useState(true);

  // Ref to track current userId for async operations
  const currentUserIdRef = useRef<string | null>(null);
  currentUserIdRef.current = user ? user.uid : null;

  // Sync with user state and Firestore listeners
  useEffect(() => {
    if (!user) {
      // Clear data from memory when logged out
      setDrivers([]);
      setEntries([]);
      setPersonalData(defaultPersonalData);
      setExpenses([]);
      setPersonalPeople([]);
      setPersonalLoans([]);
      setPersonalRepayments([]);
      setExpenseCreditors([]);
      setExpensePayments([]);
      setLoading(false);
      return;
    }

    const userId = user.uid;
    setLoading(true);

    // 1. Immediately restore this user's persistent local cache so data never flickers/disappears
    const cachedDrivers = loadUserCache<Driver[]>(userId, 'drivers', []);
    const cachedEntries = loadUserCache<KantaEntry[]>(userId, 'entries', []);
    const cachedPersonal = loadUserCache<PersonalData>(userId, 'personal', defaultPersonalData);
    const cachedExpenses = loadUserCache<OtherExpense[]>(userId, 'expenses', []);
    const cachedPeople = loadUserCache<PersonalPerson[]>(userId, 'people', []);
    const cachedLoans = loadUserCache<PersonalLoan[]>(userId, 'loans', []);
    const cachedRepayments = loadUserCache<PersonalRepayment[]>(userId, 'repayments', []);
    const cachedCreditors = loadUserCache<ExpenseCreditor[]>(userId, 'creditors', []);
    const cachedExpPayments = loadUserCache<ExpensePayment[]>(userId, 'exp_payments', []);

    setDrivers(cachedDrivers);
    setEntries(cachedEntries);
    setPersonalData(cachedPersonal);
    setExpenses(cachedExpenses);
    setPersonalPeople(cachedPeople);
    setPersonalLoans(cachedLoans);
    setPersonalRepayments(cachedRepayments);
    setExpenseCreditors(cachedCreditors);
    setExpensePayments(cachedExpPayments);
    setLoading(false);

    // 2. Set up real-time live synchronization with Cloud Firestore
    const unsubDrivers = onSnapshot(
      collection(db, 'users', userId, 'drivers'),
      (snapshot) => {
        const list: Driver[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as Driver);
        });
        list.sort((a, b) => a.name.localeCompare(b.name));
        setDrivers(list);
        saveUserCache(userId, 'drivers', list);
      },
      (error) => {
        logFirestoreError(error, OperationType.GET, `users/${userId}/drivers`);
      }
    );

    const unsubEntries = onSnapshot(
      collection(db, 'users', userId, 'kanta_entries'),
      (snapshot) => {
        const list: KantaEntry[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as KantaEntry);
        });
        setEntries(list);
        saveUserCache(userId, 'entries', list);
        setLoading(false);
      },
      (error) => {
        logFirestoreError(error, OperationType.GET, `users/${userId}/kanta_entries`);
        setLoading(false);
      }
    );

    const unsubPersonal = onSnapshot(
      doc(db, 'users', userId, 'personal_data', 'profile'),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as PersonalData;
          setPersonalData(data);
          saveUserCache(userId, 'personal', data);
        }
      },
      (error) => {
        logFirestoreError(error, OperationType.GET, `users/${userId}/personal_data/profile`);
      }
    );

    const unsubExpenses = onSnapshot(
      collection(db, 'users', userId, 'other_expenses'),
      (snapshot) => {
        const list: OtherExpense[] = [];
        snapshot.forEach((docSnap) => {
          const exp = docSnap.data() as OtherExpense;
          if (!exp.paymentStatus) {
            exp.paymentStatus = 'cash';
            exp.paidAmount = exp.amount;
            exp.dueAmount = 0;
          }
          list.push(exp);
        });
        list.sort((a, b) => b.date.localeCompare(a.date));
        setExpenses(list);
        saveUserCache(userId, 'expenses', list);
      },
      (error) => {
        logFirestoreError(error, OperationType.GET, `users/${userId}/other_expenses`);
      }
    );

    const unsubCreditors = onSnapshot(
      collection(db, 'users', userId, 'expense_creditors'),
      (snapshot) => {
        const list: ExpenseCreditor[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as ExpenseCreditor);
        });
        list.sort((a, b) => a.name.localeCompare(b.name));
        setExpenseCreditors(list);
        saveUserCache(userId, 'creditors', list);
      },
      (error) => {
        logFirestoreError(error, OperationType.GET, `users/${userId}/expense_creditors`);
      }
    );

    const unsubExpPayments = onSnapshot(
      collection(db, 'users', userId, 'expense_payments'),
      (snapshot) => {
        const list: ExpensePayment[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as ExpensePayment);
        });
        list.sort((a, b) => b.date.localeCompare(a.date));
        setExpensePayments(list);
        saveUserCache(userId, 'exp_payments', list);
      },
      (error) => {
        logFirestoreError(error, OperationType.GET, `users/${userId}/expense_payments`);
      }
    );

    const unsubPeople = onSnapshot(
      collection(db, 'users', userId, 'personal_people'),
      (snapshot) => {
        const list: PersonalPerson[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as PersonalPerson);
        });
        list.sort((a, b) => a.name.localeCompare(b.name));
        setPersonalPeople(list);
        saveUserCache(userId, 'people', list);
      },
      (error) => {
        logFirestoreError(error, OperationType.GET, `users/${userId}/personal_people`);
      }
    );

    const unsubLoans = onSnapshot(
      collection(db, 'users', userId, 'personal_loans'),
      (snapshot) => {
        const list: PersonalLoan[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as PersonalLoan);
        });
        list.sort((a, b) => b.date.localeCompare(a.date));
        setPersonalLoans(list);
        saveUserCache(userId, 'loans', list);
      },
      (error) => {
        logFirestoreError(error, OperationType.GET, `users/${userId}/personal_loans`);
      }
    );

    const unsubRepayments = onSnapshot(
      collection(db, 'users', userId, 'personal_repayments'),
      (snapshot) => {
        const list: PersonalRepayment[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as PersonalRepayment);
        });
        list.sort((a, b) => b.date.localeCompare(a.date));
        setPersonalRepayments(list);
        saveUserCache(userId, 'repayments', list);
      },
      (error) => {
        logFirestoreError(error, OperationType.GET, `users/${userId}/personal_repayments`);
      }
    );

    return () => {
      unsubDrivers();
      unsubEntries();
      unsubPersonal();
      unsubExpenses();
      unsubCreditors();
      unsubExpPayments();
      unsubPeople();
      unsubLoans();
      unsubRepayments();
    };
  }, [user]);

  // ==========================================
  // DRIVERS ACTIONS
  // ==========================================

  const addDriver = async (data: {
    name: string;
    vehicleCategory?: VehicleCategory | null;
    vehicleReg?: string | null;
    phone?: string | null;
  }): Promise<Driver> => {
    const trimmedName = (data.name || '').trim();
    if (!trimmedName) {
      throw new Error('Driver name is required.');
    }

    const driverId = `drv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const activeUserId = currentUserIdRef.current;
    const ownerId = activeUserId || 'offline-owner';

    // If user selected a category, save it; if left empty, save null (never undefined)
    const cleanCategory: VehicleCategory | null = (data.vehicleCategory && typeof data.vehicleCategory === 'string' && data.vehicleCategory.trim() !== '')
      ? (((data.vehicleCategory as string) === 'Other' ? 'Others' : data.vehicleCategory) as VehicleCategory)
      : null;

    const cleanReg: string | null = (data.vehicleReg && typeof data.vehicleReg === 'string' && data.vehicleReg.trim() !== '')
      ? data.vehicleReg.trim().toUpperCase()
      : null;

    const cleanPhone: string | null = (data.phone && typeof data.phone === 'string' && data.phone.trim() !== '')
      ? data.phone.trim()
      : null;

    const newDriver: Driver = {
      id: driverId,
      ownerId,
      name: trimmedName,
      vehicleCategory: cleanCategory,
      vehicleReg: cleanReg,
      phone: cleanPhone,
      createdAt: now,
      updatedAt: now,
    };

    setDrivers((prev) => {
      const updated = [...prev, newDriver].sort((a, b) => a.name.localeCompare(b.name));
      if (activeUserId) {
        saveUserCache(activeUserId, 'drivers', updated);
      }
      return updated;
    });

    if (activeUserId) {
      try {
        const payload = cleanForFirestore(newDriver);
        await setDoc(doc(db, 'users', activeUserId, 'drivers', driverId), payload);
      } catch (err) {
        logFirestoreError(err, OperationType.CREATE, `users/${activeUserId}/drivers/${driverId}`);
        throw err;
      }
    }

    return newDriver;
  };

  const updateDriver = async (id: string, updates: Partial<Driver>) => {
    const now = new Date().toISOString();
    const activeUserId = currentUserIdRef.current;

    let updatedDriver: Driver | null = null;
    setDrivers((prev) => {
      const existing = prev.find((d) => d.id === id);
      if (!existing) return prev;

      let category: VehicleCategory | null;
      if (updates.vehicleCategory !== undefined) {
        category = updates.vehicleCategory && typeof updates.vehicleCategory === 'string' && updates.vehicleCategory.trim() !== ''
          ? (((updates.vehicleCategory as string) === 'Other' ? 'Others' : updates.vehicleCategory) as VehicleCategory)
          : null;
      } else {
        category = existing.vehicleCategory ?? null;
      }

      let reg: string | null;
      if (updates.vehicleReg !== undefined) {
        reg = updates.vehicleReg && typeof updates.vehicleReg === 'string' && updates.vehicleReg.trim() !== ''
          ? updates.vehicleReg.trim().toUpperCase()
          : null;
      } else {
        reg = existing.vehicleReg ?? null;
      }

      let phone: string | null;
      if (updates.phone !== undefined) {
        phone = updates.phone && typeof updates.phone === 'string' && updates.phone.trim() !== ''
          ? updates.phone.trim()
          : null;
      } else {
        phone = existing.phone ?? null;
      }

      updatedDriver = {
        ...existing,
        ...updates,
        name: updates.name ? updates.name.trim() : existing.name,
        vehicleCategory: category,
        vehicleReg: reg,
        phone: phone,
        updatedAt: now,
      };
      const updatedList = prev.map((d) => (d.id === id ? updatedDriver! : d));
      if (activeUserId) {
        saveUserCache(activeUserId, 'drivers', updatedList);
      }
      return updatedList;
    });

    if (activeUserId && updatedDriver) {
      try {
        const payload = cleanForFirestore(updatedDriver);
        await setDoc(doc(db, 'users', activeUserId, 'drivers', id), payload);
      } catch (err) {
        logFirestoreError(err, OperationType.UPDATE, `users/${activeUserId}/drivers/${id}`);
        throw err;
      }
    }
  };

  const deleteDriver = async (id: string) => {
    const activeUserId = currentUserIdRef.current;

    setDrivers((prev) => {
      const updated = prev.filter((d) => d.id !== id);
      if (activeUserId) {
        saveUserCache(activeUserId, 'drivers', updated);
      }
      return updated;
    });

    setEntries((prev) => {
      const updated = prev.filter((e) => e.driverId !== id);
      if (activeUserId) {
        saveUserCache(activeUserId, 'entries', updated);
      }
      return updated;
    });

    if (activeUserId) {
      try {
        await deleteDoc(doc(db, 'users', activeUserId, 'drivers', id));
      } catch (err) {
        logFirestoreError(err, OperationType.DELETE, `users/${activeUserId}/drivers/${id}`);
      }
    }
  };

  // ==========================================
  // DRIVER KHATA & WEIGHT ENTRIES
  // ==========================================

  const getDriverEntries = (driverId: string): KantaEntry[] => {
    return entries
      .filter((e) => e.driverId === driverId)
      .sort((a, b) => {
        if (a.date === b.date) {
          return (b.createdAt || '').localeCompare(a.createdAt || '');
        }
        return b.date.localeCompare(a.date);
      });
  };

  const addDriverEntry = async (
    driverId: string,
    entry: {
      date: string;
      vehicleCategory: VehicleCategory;
      vehicleReg?: string;
      firstWeight: number | '';
      secondWeight: number | '';
      thirdWeight: number | '';
      totalPrice: number;
      receivedPrice: number;
      duePrice: number;
    }
  ): Promise<KantaEntry> => {
    const driver = drivers.find((d) => d.id === driverId);
    const activeUserId = currentUserIdRef.current;
    const ownerId = activeUserId || 'offline-owner';
    const entryId = `entry_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const newEntry: KantaEntry = {
      id: entryId,
      ownerId,
      driverId: driverId,
      driverName: driver?.name || 'Driver',
      date: entry.date,
      vehicleCategory: entry.vehicleCategory,
      vehicleReg: entry.vehicleReg?.trim().toUpperCase() || '',
      firstWeight: entry.firstWeight !== '' ? Number(entry.firstWeight) : '',
      secondWeight: entry.secondWeight !== '' ? Number(entry.secondWeight) : '',
      thirdWeight: entry.thirdWeight !== '' ? Number(entry.thirdWeight) : '',
      totalPrice: Number(entry.totalPrice) || 0,
      receivedPrice: Number(entry.receivedPrice) || 0,
      duePrice: Number(entry.duePrice) || 0,
      createdAt: now,
      updatedAt: now,
    };

    setEntries((prev) => {
      const updated = [newEntry, ...prev];
      if (activeUserId) {
        saveUserCache(activeUserId, 'entries', updated);
      }
      return updated;
    });

    if (activeUserId) {
      try {
        await setDoc(doc(db, 'users', activeUserId, 'kanta_entries', entryId), cleanForFirestore(newEntry));
      } catch (err) {
        logFirestoreError(err, OperationType.CREATE, `users/${activeUserId}/kanta_entries/${entryId}`);
      }
    }

    return newEntry;
  };

  const updateEntry = async (entryId: string, updates: Partial<KantaEntry>) => {
    const now = new Date().toISOString();
    const activeUserId = currentUserIdRef.current;

    let updatedEntry: KantaEntry | null = null;
    setEntries((prev) => {
      const existing = prev.find((e) => e.id === entryId);
      if (!existing) return prev;
      updatedEntry = { ...existing, ...updates, updatedAt: now };
      const updatedList = prev.map((e) => (e.id === entryId ? updatedEntry! : e));
      if (activeUserId) {
        saveUserCache(activeUserId, 'entries', updatedList);
      }
      return updatedList;
    });

    if (activeUserId && updatedEntry) {
      try {
        await setDoc(doc(db, 'users', activeUserId, 'kanta_entries', entryId), cleanForFirestore(updatedEntry));
      } catch (err) {
        logFirestoreError(err, OperationType.UPDATE, `users/${activeUserId}/kanta_entries/${entryId}`);
      }
    }
  };

  const deleteEntry = async (entryId: string) => {
    const activeUserId = currentUserIdRef.current;

    setEntries((prev) => {
      const updated = prev.filter((e) => e.id !== entryId);
      if (activeUserId) {
        saveUserCache(activeUserId, 'entries', updated);
      }
      return updated;
    });

    if (activeUserId) {
      try {
        await deleteDoc(doc(db, 'users', activeUserId, 'kanta_entries', entryId));
      } catch (err) {
        logFirestoreError(err, OperationType.DELETE, `users/${activeUserId}/kanta_entries/${entryId}`);
      }
    }
  };

  const updatePersonalData = async (data: Partial<PersonalData>) => {
    const now = new Date().toISOString();
    const activeUserId = currentUserIdRef.current;

    setPersonalData((prev) => {
      const merged = { ...prev, ...data, updatedAt: now };
      if (activeUserId) {
        saveUserCache(activeUserId, 'personal', merged);
      }
      return merged;
    });

    if (activeUserId) {
      try {
        await setDoc(doc(db, 'users', activeUserId, 'personal_data', 'profile'), cleanForFirestore({
          ...personalData,
          ...data,
          updatedAt: now,
        }), { merge: true });
      } catch (err) {
        logFirestoreError(err, OperationType.WRITE, `users/${activeUserId}/personal_data/profile`);
      }
    }
  };

  // ==========================================
  // OTHER EXPENSES (Cash or Credit)
  // ==========================================

  const addExpense = async (expense: {
    date: string;
    category: string;
    description?: string;
    amount: number;
    paymentStatus: ExpensePaymentStatus;
    creditorId?: string;
    creditorName?: string;
    initialPaid?: number;
    paymentMethod?: string;
  }): Promise<OtherExpense> => {
    const id = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const activeUserId = currentUserIdRef.current;
    const ownerId = activeUserId || 'offline-owner';
    const totalAmount = Number(expense.amount) || 0;

    const isCredit = expense.paymentStatus === 'credit';
    const paidAmount = isCredit ? Math.min(totalAmount, Number(expense.initialPaid) || 0) : totalAmount;
    const dueAmount = Math.max(0, totalAmount - paidAmount);

    const newExp: OtherExpense = {
      id,
      ownerId,
      date: expense.date,
      category: expense.category,
      description: expense.description?.trim() || '',
      amount: totalAmount,
      paymentStatus: expense.paymentStatus,
      creditorId: isCredit ? (expense.creditorId || '') : '',
      creditorName: isCredit ? (expense.creditorName || '') : '',
      paidAmount,
      dueAmount,
      paymentMethod: expense.paymentMethod || 'Cash',
      createdAt: now,
      updatedAt: now,
    };

    setExpenses((prev) => {
      const updated = [newExp, ...prev];
      if (activeUserId) {
        saveUserCache(activeUserId, 'expenses', updated);
      }
      return updated;
    });

    if (activeUserId) {
      try {
        await setDoc(doc(db, 'users', activeUserId, 'other_expenses', id), newExp);
      } catch (err) {
        logFirestoreError(err, OperationType.CREATE, `users/${activeUserId}/other_expenses/${id}`);
      }
    }

    if (isCredit && paidAmount > 0 && expense.creditorId) {
      await addExpensePayment({
        expenseId: id,
        creditorId: expense.creditorId,
        date: expense.date,
        amount: paidAmount,
        notes: 'Initial payment upon credit purchase',
      });
    }

    return newExp;
  };

  const deleteExpense = async (id: string) => {
    const activeUserId = currentUserIdRef.current;

    setExpenses((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      if (activeUserId) {
        saveUserCache(activeUserId, 'expenses', updated);
      }
      return updated;
    });

    setExpensePayments((prev) => {
      const updated = prev.filter((p) => p.expenseId !== id);
      if (activeUserId) {
        saveUserCache(activeUserId, 'exp_payments', updated);
      }
      return updated;
    });

    if (activeUserId) {
      try {
        await deleteDoc(doc(db, 'users', activeUserId, 'other_expenses', id));
      } catch (err) {
        logFirestoreError(err, OperationType.DELETE, `users/${activeUserId}/other_expenses/${id}`);
      }
    }
  };

  const addExpenseCreditor = async (data: {
    name: string;
    phone?: string;
    notes?: string;
  }): Promise<ExpenseCreditor> => {
    const id = `crd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const activeUserId = currentUserIdRef.current;
    const ownerId = activeUserId || 'offline-owner';

    const newCreditor: ExpenseCreditor = {
      id,
      ownerId,
      name: data.name.trim(),
      phone: data.phone?.trim() || '',
      notes: data.notes?.trim() || '',
      createdAt: now,
      updatedAt: now,
    };

    setExpenseCreditors((prev) => {
      const updated = [...prev, newCreditor].sort((a, b) => a.name.localeCompare(b.name));
      if (activeUserId) {
        saveUserCache(activeUserId, 'creditors', updated);
      }
      return updated;
    });

    if (activeUserId) {
      try {
        await setDoc(doc(db, 'users', activeUserId, 'expense_creditors', id), newCreditor);
      } catch (err) {
        logFirestoreError(err, OperationType.CREATE, `users/${activeUserId}/expense_creditors/${id}`);
      }
    }

    return newCreditor;
  };

  const updateExpenseCreditor = async (id: string, updates: Partial<ExpenseCreditor>) => {
    const now = new Date().toISOString();
    const activeUserId = currentUserIdRef.current;

    let updatedCreditor: ExpenseCreditor | null = null;
    setExpenseCreditors((prev) => {
      const existing = prev.find((c) => c.id === id);
      if (!existing) return prev;
      updatedCreditor = { ...existing, ...updates, updatedAt: now };
      const updatedList = prev.map((c) => (c.id === id ? updatedCreditor! : c));
      if (activeUserId) {
        saveUserCache(activeUserId, 'creditors', updatedList);
      }
      return updatedList;
    });

    if (activeUserId && updatedCreditor) {
      try {
        await setDoc(doc(db, 'users', activeUserId, 'expense_creditors', id), updatedCreditor);
      } catch (err) {
        logFirestoreError(err, OperationType.UPDATE, `users/${activeUserId}/expense_creditors/${id}`);
      }
    }
  };

  const deleteExpenseCreditor = async (id: string) => {
    const activeUserId = currentUserIdRef.current;

    setExpenseCreditors((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      if (activeUserId) {
        saveUserCache(activeUserId, 'creditors', updated);
      }
      return updated;
    });

    if (activeUserId) {
      try {
        await deleteDoc(doc(db, 'users', activeUserId, 'expense_creditors', id));
      } catch (err) {
        logFirestoreError(err, OperationType.DELETE, `users/${activeUserId}/expense_creditors/${id}`);
      }
    }
  };

  const addExpensePayment = async (data: {
    expenseId: string;
    creditorId: string;
    date: string;
    amount: number;
    notes?: string;
  }): Promise<ExpensePayment> => {
    const paymentId = `exp_pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const activeUserId = currentUserIdRef.current;
    const ownerId = activeUserId || 'offline-owner';
    const numAmount = Number(data.amount) || 0;

    const newPayment: ExpensePayment = {
      id: paymentId,
      ownerId,
      expenseId: data.expenseId,
      creditorId: data.creditorId,
      date: data.date,
      amount: numAmount,
      notes: data.notes?.trim() || '',
      createdAt: now,
    };

    setExpensePayments((prev) => {
      const updated = [newPayment, ...prev];
      if (activeUserId) {
        saveUserCache(activeUserId, 'exp_payments', updated);
      }
      return updated;
    });

    // Update the parent expense paidAmount and dueAmount
    setExpenses((prev) => {
      const exp = prev.find((e) => e.id === data.expenseId);
      if (!exp) return prev;
      const newPaid = (exp.paidAmount || 0) + numAmount;
      const newDue = Math.max(0, exp.amount - newPaid);
      const updatedExp: OtherExpense = {
        ...exp,
        paidAmount: newPaid,
        dueAmount: newDue,
        updatedAt: now,
      };
      const updatedList = prev.map((e) => (e.id === exp.id ? updatedExp : e));
      if (activeUserId) {
        saveUserCache(activeUserId, 'expenses', updatedList);
      }
      if (activeUserId) {
        setDoc(doc(db, 'users', activeUserId, 'other_expenses', exp.id), updatedExp).catch((err) => {
          logFirestoreError(err, OperationType.UPDATE, `users/${activeUserId}/other_expenses/${exp.id}`);
        });
      }
      return updatedList;
    });

    if (activeUserId) {
      try {
        await setDoc(doc(db, 'users', activeUserId, 'expense_payments', paymentId), newPayment);
      } catch (err) {
        logFirestoreError(err, OperationType.CREATE, `users/${activeUserId}/expense_payments/${paymentId}`);
      }
    }

    return newPayment;
  };

  const deleteExpensePayment = async (id: string) => {
    const activeUserId = currentUserIdRef.current;

    let deletedPayment: ExpensePayment | null = null;
    setExpensePayments((prev) => {
      deletedPayment = prev.find((p) => p.id === id) || null;
      const updated = prev.filter((p) => p.id !== id);
      if (activeUserId) {
        saveUserCache(activeUserId, 'exp_payments', updated);
      }
      return updated;
    });

    if (deletedPayment) {
      const pmt = deletedPayment as ExpensePayment;
      setExpenses((prev) => {
        const exp = prev.find((e) => e.id === pmt.expenseId);
        if (!exp) return prev;
        const newPaid = Math.max(0, (exp.paidAmount || 0) - pmt.amount);
        const newDue = Math.max(0, exp.amount - newPaid);
        const updatedExp: OtherExpense = {
          ...exp,
          paidAmount: newPaid,
          dueAmount: newDue,
          updatedAt: new Date().toISOString(),
        };
        const updatedList = prev.map((e) => (e.id === exp.id ? updatedExp : e));
        if (activeUserId) {
          saveUserCache(activeUserId, 'expenses', updatedList);
        }
        if (activeUserId) {
          setDoc(doc(db, 'users', activeUserId, 'other_expenses', exp.id), updatedExp).catch((err) => {
            logFirestoreError(err, OperationType.UPDATE, `users/${activeUserId}/other_expenses/${exp.id}`);
          });
        }
        return updatedList;
      });
    }

    if (activeUserId) {
      try {
        await deleteDoc(doc(db, 'users', activeUserId, 'expense_payments', id));
      } catch (err) {
        logFirestoreError(err, OperationType.DELETE, `users/${activeUserId}/expense_payments/${id}`);
      }
    }
  };

  const getCreditorExpenses = (creditorId: string): OtherExpense[] => {
    return expenses
      .filter((e) => e.creditorId === creditorId)
      .sort((a, b) => b.date.localeCompare(a.date));
  };

  const getCreditorPayments = (creditorId: string): ExpensePayment[] => {
    return expensePayments
      .filter((p) => p.creditorId === creditorId)
      .sort((a, b) => b.date.localeCompare(a.date));
  };

  const getExpensePayments = (expenseId: string): ExpensePayment[] => {
    return expensePayments
      .filter((p) => p.expenseId === expenseId)
      .sort((a, b) => b.date.localeCompare(a.date));
  };

  const getCreditorBalances = (creditorId: string): CreditorBalanceSummary => {
    const credExpenses = expenses.filter((e) => e.creditorId === creditorId);
    const totalCredit = credExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const totalPaid = credExpenses.reduce((sum, e) => sum + (Number(e.paidAmount) || 0), 0);
    const remainingDue = Math.max(0, totalCredit - totalPaid);

    return {
      totalCredit,
      totalPaid,
      remainingDue,
    };
  };

  // ==========================================
  // PERSONAL DATA — LOAN & UDHAR
  // ==========================================

  const addPersonalPerson = async (data: {
    name: string;
    phone?: string;
    notes?: string;
  }): Promise<PersonalPerson> => {
    const personId = `prs_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const activeUserId = currentUserIdRef.current;
    const ownerId = activeUserId || 'offline-owner';

    const newPerson: PersonalPerson = {
      id: personId,
      ownerId,
      name: data.name.trim(),
      phone: data.phone?.trim() || '',
      notes: data.notes?.trim() || '',
      createdAt: now,
      updatedAt: now,
    };

    setPersonalPeople((prev) => {
      const updated = [...prev, newPerson].sort((a, b) => a.name.localeCompare(b.name));
      if (activeUserId) {
        saveUserCache(activeUserId, 'people', updated);
      }
      return updated;
    });

    if (activeUserId) {
      try {
        await setDoc(doc(db, 'users', activeUserId, 'personal_people', personId), newPerson);
      } catch (err) {
        logFirestoreError(err, OperationType.CREATE, `users/${activeUserId}/personal_people/${personId}`);
      }
    }

    return newPerson;
  };

  const updatePersonalPerson = async (id: string, updates: Partial<PersonalPerson>) => {
    const now = new Date().toISOString();
    const activeUserId = currentUserIdRef.current;

    let updatedPerson: PersonalPerson | null = null;
    setPersonalPeople((prev) => {
      const existing = prev.find((p) => p.id === id);
      if (!existing) return prev;
      updatedPerson = { ...existing, ...updates, updatedAt: now };
      const updatedList = prev.map((p) => (p.id === id ? updatedPerson! : p));
      if (activeUserId) {
        saveUserCache(activeUserId, 'people', updatedList);
      }
      return updatedList;
    });

    if (activeUserId && updatedPerson) {
      try {
        await setDoc(doc(db, 'users', activeUserId, 'personal_people', id), updatedPerson);
      } catch (err) {
        logFirestoreError(err, OperationType.UPDATE, `users/${activeUserId}/personal_people/${id}`);
      }
    }
  };

  const deletePersonalPerson = async (id: string) => {
    const activeUserId = currentUserIdRef.current;

    setPersonalPeople((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      if (activeUserId) {
        saveUserCache(activeUserId, 'people', updated);
      }
      return updated;
    });

    setPersonalLoans((prev) => {
      const updated = prev.filter((l) => l.personId !== id);
      if (activeUserId) {
        saveUserCache(activeUserId, 'loans', updated);
      }
      return updated;
    });

    setPersonalRepayments((prev) => {
      const updated = prev.filter((r) => r.personId !== id);
      if (activeUserId) {
        saveUserCache(activeUserId, 'repayments', updated);
      }
      return updated;
    });

    if (activeUserId) {
      try {
        await deleteDoc(doc(db, 'users', activeUserId, 'personal_people', id));
      } catch (err) {
        logFirestoreError(err, OperationType.DELETE, `users/${activeUserId}/personal_people/${id}`);
      }
    }
  };

  const addPersonalLoan = async (data: {
    personId: string;
    personName: string;
    date: string;
    type: LoanType;
    amount: number;
    notes?: string;
  }): Promise<PersonalLoan> => {
    const loanId = `loan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const activeUserId = currentUserIdRef.current;
    const ownerId = activeUserId || 'offline-owner';

    const newLoan: PersonalLoan = {
      id: loanId,
      ownerId,
      personId: data.personId,
      personName: data.personName,
      date: data.date,
      type: data.type,
      amount: Number(data.amount) || 0,
      notes: data.notes?.trim() || '',
      createdAt: now,
      updatedAt: now,
    };

    setPersonalLoans((prev) => {
      const updated = [newLoan, ...prev];
      if (activeUserId) {
        saveUserCache(activeUserId, 'loans', updated);
      }
      return updated;
    });

    if (activeUserId) {
      try {
        await setDoc(doc(db, 'users', activeUserId, 'personal_loans', loanId), newLoan);
      } catch (err) {
        logFirestoreError(err, OperationType.CREATE, `users/${activeUserId}/personal_loans/${loanId}`);
      }
    }

    return newLoan;
  };

  const updatePersonalLoan = async (id: string, updates: Partial<PersonalLoan>) => {
    const now = new Date().toISOString();
    const activeUserId = currentUserIdRef.current;

    let updatedLoan: PersonalLoan | null = null;
    setPersonalLoans((prev) => {
      const existing = prev.find((l) => l.id === id);
      if (!existing) return prev;
      updatedLoan = { ...existing, ...updates, updatedAt: now };
      const updatedList = prev.map((l) => (l.id === id ? updatedLoan! : l));
      if (activeUserId) {
        saveUserCache(activeUserId, 'loans', updatedList);
      }
      return updatedList;
    });

    if (activeUserId && updatedLoan) {
      try {
        await setDoc(doc(db, 'users', activeUserId, 'personal_loans', id), updatedLoan);
      } catch (err) {
        logFirestoreError(err, OperationType.UPDATE, `users/${activeUserId}/personal_loans/${id}`);
      }
    }
  };

  const deletePersonalLoan = async (id: string) => {
    const activeUserId = currentUserIdRef.current;

    setPersonalLoans((prev) => {
      const updated = prev.filter((l) => l.id !== id);
      if (activeUserId) {
        saveUserCache(activeUserId, 'loans', updated);
      }
      return updated;
    });

    setPersonalRepayments((prev) => {
      const updated = prev.filter((r) => r.loanId !== id);
      if (activeUserId) {
        saveUserCache(activeUserId, 'repayments', updated);
      }
      return updated;
    });

    if (activeUserId) {
      try {
        await deleteDoc(doc(db, 'users', activeUserId, 'personal_loans', id));
      } catch (err) {
        logFirestoreError(err, OperationType.DELETE, `users/${activeUserId}/personal_loans/${id}`);
      }
    }
  };

  const addPersonalRepayment = async (data: {
    personId: string;
    loanId: string;
    date: string;
    direction: RepaymentDirection;
    amount: number;
    notes?: string;
  }): Promise<PersonalRepayment> => {
    const id = `repay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const activeUserId = currentUserIdRef.current;
    const ownerId = activeUserId || 'offline-owner';

    const newRepayment: PersonalRepayment = {
      id,
      ownerId,
      personId: data.personId,
      loanId: data.loanId || '',
      date: data.date,
      direction: data.direction,
      amount: Number(data.amount) || 0,
      notes: data.notes?.trim() || '',
      createdAt: now,
    };

    setPersonalRepayments((prev) => {
      const updated = [newRepayment, ...prev];
      if (activeUserId) {
        saveUserCache(activeUserId, 'repayments', updated);
      }
      return updated;
    });

    if (activeUserId) {
      try {
        await setDoc(doc(db, 'users', activeUserId, 'personal_repayments', id), newRepayment);
      } catch (err) {
        logFirestoreError(err, OperationType.CREATE, `users/${activeUserId}/personal_repayments/${id}`);
      }
    }

    return newRepayment;
  };

  const deletePersonalRepayment = async (id: string) => {
    const activeUserId = currentUserIdRef.current;

    setPersonalRepayments((prev) => {
      const updated = prev.filter((r) => r.id !== id);
      if (activeUserId) {
        saveUserCache(activeUserId, 'repayments', updated);
      }
      return updated;
    });

    if (activeUserId) {
      try {
        await deleteDoc(doc(db, 'users', activeUserId, 'personal_repayments', id));
      } catch (err) {
        logFirestoreError(err, OperationType.DELETE, `users/${activeUserId}/personal_repayments/${id}`);
      }
    }
  };

  const getPersonLoans = (personId: string): PersonalLoan[] => {
    return personalLoans
      .filter((l) => l.personId === personId)
      .sort((a, b) => {
        if (a.date === b.date) {
          return (b.createdAt || '').localeCompare(a.createdAt || '');
        }
        return b.date.localeCompare(a.date);
      });
  };

  const getPersonRepayments = (personId: string): PersonalRepayment[] => {
    return personalRepayments
      .filter((r) => r.personId === personId)
      .sort((a, b) => {
        if (a.date === b.date) {
          return (b.createdAt || '').localeCompare(a.createdAt || '');
        }
        return b.date.localeCompare(a.date);
      });
  };

  const getLoanRepayments = (loanId: string): PersonalRepayment[] => {
    return personalRepayments
      .filter((r) => r.loanId === loanId)
      .sort((a, b) => b.date.localeCompare(a.date));
  };

  const getLoanRemaining = (loanId: string): number => {
    const loan = personalLoans.find((l) => l.id === loanId);
    if (!loan) return 0;
    const repayments = personalRepayments.filter((r) => r.loanId === loanId);
    const totalRepaid = repayments.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    return Math.max(0, loan.amount - totalRepaid);
  };

  const getPersonBalances = (personId: string): PersonBalanceSummary => {
    const pLoans = personalLoans.filter((l) => l.personId === personId);
    const pRepayments = personalRepayments.filter((r) => r.personId === personId);

    const totalBorrowed = pLoans
      .filter((l) => l.type === 'borrowed')
      .reduce((sum, l) => sum + (Number(l.amount) || 0), 0);

    const totalRepaidBorrowed = pRepayments
      .filter((r) => r.direction === 'repaid_borrowed')
      .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

    const remainingBorrowed = Math.max(0, totalBorrowed - totalRepaidBorrowed);

    const totalLent = pLoans
      .filter((l) => l.type === 'lent')
      .reduce((sum, l) => sum + (Number(l.amount) || 0), 0);

    const totalRepaidLent = pRepayments
      .filter((r) => r.direction === 'received_lent')
      .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

    const remainingLent = Math.max(0, totalLent - totalRepaidLent);
    const netPosition = remainingLent - remainingBorrowed;

    return {
      totalBorrowed,
      totalRepaidBorrowed,
      remainingBorrowed,
      totalLent,
      totalRepaidLent,
      remainingLent,
      netPosition,
    };
  };

  return (
    <KantaDataContext.Provider
      value={{
        drivers,
        entries,
        personalData,
        expenses,
        personalPeople,
        personalLoans,
        personalRepayments,
        expenseCreditors,
        expensePayments,
        loading,
        addDriver,
        updateDriver,
        deleteDriver,
        getDriverEntries,
        addDriverEntry,
        updateEntry,
        deleteEntry,
        updatePersonalData,
        addExpense,
        deleteExpense,
        addExpenseCreditor,
        updateExpenseCreditor,
        deleteExpenseCreditor,
        addExpensePayment,
        deleteExpensePayment,
        getCreditorExpenses,
        getCreditorPayments,
        getExpensePayments,
        getCreditorBalances,
        addPersonalPerson,
        updatePersonalPerson,
        deletePersonalPerson,
        addPersonalLoan,
        updatePersonalLoan,
        deletePersonalLoan,
        addPersonalRepayment,
        deletePersonalRepayment,
        getPersonLoans,
        getPersonRepayments,
        getLoanRepayments,
        getPersonBalances,
        getLoanRemaining,
      }}
    >
      {children}
    </KantaDataContext.Provider>
  );
};

export const useKantaData = () => {
  const context = useContext(KantaDataContext);
  if (!context) {
    throw new Error('useKantaData must be used within a KantaDataProvider');
  }
  return context;
};
