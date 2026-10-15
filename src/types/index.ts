export type VehicleCategory = 
  | 'Loader Rickshaw'
  | 'Milk Van'
  | 'Truck'
  | 'Tractor Trolley'
  | '10-Wheeler Truck'
  | '6-Wheeler Truck'
  | 'Donkey Cart'
  | 'Others';

export const VEHICLE_CATEGORIES: VehicleCategory[] = [
  'Loader Rickshaw',
  'Milk Van',
  'Truck',
  'Tractor Trolley',
  '10-Wheeler Truck',
  '6-Wheeler Truck',
  'Donkey Cart',
  'Others',
];

export interface Driver {
  id: string; // Permanent unique driver ID
  ownerId: string;
  name: string;
  vehicleCategory?: VehicleCategory | null;
  vehicleReg?: string | null;
  phone?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface KantaEntry {
  id: string;
  ownerId: string;
  driverId: string; // STRICT UNIQUE DRIVER LINK
  driverName: string;
  date: string; // YYYY-MM-DD
  vehicleCategory: VehicleCategory;
  vehicleReg?: string;
  firstWeight: number | '';
  secondWeight: number | '';
  thirdWeight: number | '';
  totalPrice: number;
  receivedPrice: number;
  duePrice: number; // totalPrice - receivedPrice
  createdAt: string;
  updatedAt: string;
}

export interface PersonalData {
  ownerName: string;
  shopName?: string; // Required personalized shop name
  phone: string;
  kantaName: string;
  address: string;
  notes: string;
  updatedAt: string;
}

// Other Expenses — Cash or Credit & Creditor tracking
export type ExpensePaymentStatus = 'cash' | 'credit';

export interface ExpenseCreditor {
  id: string;
  ownerId: string;
  name: string;
  phone?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpensePayment {
  id: string;
  ownerId: string;
  expenseId: string;
  creditorId: string;
  date: string;
  amount: number;
  notes?: string;
  createdAt: string;
}

export interface OtherExpense {
  id: string;
  ownerId: string;
  date: string;
  category: string;
  description?: string;
  amount: number; // Total Expense Amount in PKR
  paymentStatus: ExpensePaymentStatus; // 'cash' | 'credit'
  creditorId?: string;
  creditorName?: string;
  paidAmount: number; // Amount paid so far
  dueAmount: number; // Total Expense Amount - paidAmount
  paymentMethod?: string;
  createdAt: string;
  updatedAt: string;
}

// Personal Data — Loan & Udhar Accounts
export type LoanType = 'borrowed' | 'lent';
export type RepaymentDirection = 'repaid_borrowed' | 'received_lent';

export interface PersonalPerson {
  id: string;
  ownerId: string;
  name: string;
  phone?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PersonalLoan {
  id: string;
  ownerId: string;
  personId: string;
  personName: string;
  date: string; // YYYY-MM-DD
  type: LoanType; // 'borrowed' | 'lent'
  amount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PersonalRepayment {
  id: string;
  ownerId: string;
  personId: string;
  loanId: string; // Links to specific loan transaction
  date: string; // YYYY-MM-DD
  direction: RepaymentDirection; // 'repaid_borrowed' | 'received_lent'
  amount: number;
  notes?: string;
  createdAt: string;
}
