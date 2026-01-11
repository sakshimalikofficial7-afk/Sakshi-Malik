
export interface LineItem {
  label: string;
  amount: number;
}

export interface LoanRecord {
  id: string;
  name: string; 
  amount: number;
  interestRate: number;
  durationMonths: number;
  paidMonths: number;
  totalRepayment: number;
  paidAmount: number;
  date: string;
  isRepaid: boolean;
  penaltyOverdue?: number; 
  loanType?: 'regular' | 'daily';
  repaymentCycle?: 'monthly' | 'yearly';
}

export interface TransactionLog {
  id: string;
  date: string;
  type: 'TAX_PAYMENT' | 'LOAN_CREDIT' | 'EMI_DEBIT' | 'MODE_ACTIVATE';
  description: string;
  amount: number;
}

export interface Customer {
  token: string;
  name: string;
  taxType: string;
  district: string;
  price: string;
  brokerage: string;
  status: boolean;
  cibilScore?: number;
  businessPlusActive?: boolean;
}

export interface PaymentRecord {
  year: number;
  items: LineItem[];
}

export interface SponsorStat {
  label: string;
  totalCollected: number;
  count: number;
}

export interface Stats {
  totalCustomers: number;
  paidCount: number;
  pendingCount: number;
  totalRevenue: number;
  totalLoansDisbursed: number;
  sponsorStats: SponsorStat[];
}
