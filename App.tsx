
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { customerData as initialData } from './data';
import { Customer, Stats, LineItem, PaymentRecord, LoanRecord, TransactionLog } from './types';
import CustomerTable from './components/CustomerTable';
import StatsCards from './components/StatsCards';
import CustomerModal from './components/CustomerModal';

type FilterStatus = 'all' | 'paid' | 'pending' | 'loan';

const STORAGE_KEYS = {
  PAYMENTS: 'hpg_tax_payment_history_v8',
  LOANS: 'hpg_tax_loan_history_v8',
  CUSTOMERS: 'hpg_tax_customers_v8',
  LOGS: 'hpg_tax_transaction_logs_v8'
};

function App() {
  const [isSaving, setIsSaving] = useState(false);
  
  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    return saved ? JSON.parse(saved) : initialData;
  });

  const [paymentHistory, setPaymentHistory] = useState<Record<string, Record<number, PaymentRecord>>>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
    return saved ? JSON.parse(saved) : {};
  });

  const [loanHistory, setLoanHistory] = useState<Record<string, LoanRecord[]>>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LOANS);
    return saved ? JSON.parse(saved) : {};
  });

  const [transactionLogs, setTransactionLogs] = useState<Record<string, TransactionLog[]>>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LOGS);
    return saved ? JSON.parse(saved) : {};
  });

  const [selectedYear, setSelectedYear] = useState(2026);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [modalMode, setModalMode] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  useEffect(() => {
    setIsSaving(true);
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(paymentHistory));
    localStorage.setItem(STORAGE_KEYS.LOANS, JSON.stringify(loanHistory));
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(transactionLogs));
    const timer = setTimeout(() => setIsSaving(false), 500);
    return () => clearTimeout(timer);
  }, [paymentHistory, loanHistory, customers, transactionLogs]);

  const addLog = (token: string, type: TransactionLog['type'], description: string, amount: number) => {
    const newLog: TransactionLog = {
      id: Math.random().toString(36).substr(2, 9).toUpperCase(),
      date: new Date().toLocaleString('en-IN'),
      type,
      description,
      amount
    };
    setTransactionLogs(prev => ({
      ...prev,
      [token]: [newLog, ...(prev[token] || [])]
    }));
  };

  const handlePaymentComplete = (token: string, year: number, items: LineItem[]) => {
    setPaymentHistory(prev => ({ ...prev, [token]: { ...(prev[token] || {}), [year]: { year, items } } }));
    const total = items.reduce((sum, item) => sum + item.amount, 0);
    addLog(token, 'TAX_PAYMENT', `Tax Assessment FY ${year} Completed`, total);
  };

  const handleUpgradeBusinessPlus = (token: string) => {
    setCustomers(prev => prev.map(c => c.token === token ? { ...c, businessPlusActive: true } : c));
    addLog(token, 'MODE_ACTIVATE', "Premium Daily Mode Activated", 0);
  };

  const handleLoanComplete = (token: string, loan: LoanRecord) => {
    setLoanHistory(prev => ({ ...prev, [token]: [...(prev[token] || []), loan] }));
    addLog(token, 'LOAN_CREDIT', `Loan Disbursed: ${loan.name}`, loan.amount);
  };

  const handleLoanRepayment = (token: string, loanId: string, amount: number, months: number) => {
    setLoanHistory(prev => {
      const customerLoans = prev[token] || [];
      return { ...prev, [token]: customerLoans.map(loan => {
        if (loan.id === loanId) {
          const newPaidAmount = loan.paidAmount + amount;
          const newPaidMonths = loan.paidMonths + months;
          return { ...loan, paidAmount: newPaidAmount, paidMonths: newPaidMonths, isRepaid: newPaidAmount >= loan.totalRepayment };
        }
        return loan;
      })};
    });
    addLog(token, 'EMI_DEBIT', `EMI Recovery: ${months} Installments Paid`, amount);
  };

  const isPaid = (token: string, year: number) => (year === 2024 ? true : !!paymentHistory[token]?.[year]);
  const getLoanBalance = (token: string) => (loanHistory[token] || []).reduce((acc, l) => acc + (l.isRepaid ? 0 : (l.totalRepayment - l.paidAmount)), 0);

  const calculateCibilScore = (token: string) => {
    const loans = loanHistory[token] || [];
    if (loans.length === 0) return 750;
    let base = 750;
    loans.forEach(loan => {
      const overdue = Math.max(0, loan.durationMonths - loan.paidMonths);
      base -= (overdue * 5); 
      base += (loan.paidMonths * 2);
    });
    return Math.max(300, Math.min(900, base));
  };

  const stats = useMemo<Stats>(() => {
    const paidCount = customers.filter(c => isPaid(c.token, selectedYear)).length;
    return {
      totalCustomers: customers.length,
      paidCount,
      pendingCount: customers.length - paidCount,
      totalRevenue: 0,
      totalLoansDisbursed: 0,
      sponsorStats: []
    };
  }, [selectedYear, paymentHistory, customers]);

  const filteredCustomers = useMemo(() => {
    let result = customers;
    if (filterStatus === 'paid') result = result.filter(c => isPaid(c.token, selectedYear));
    else if (filterStatus === 'pending') result = result.filter(c => !isPaid(c.token, selectedYear));
    else if (filterStatus === 'loan') result = result.filter(c => getLoanBalance(c.token) > 0);
    
    if (!searchTerm) return result;
    const lowerSearch = searchTerm.toLowerCase();
    return result.filter(c => c.token.toLowerCase().includes(lowerSearch) || c.name.toLowerCase().includes(lowerSearch));
  }, [searchTerm, filterStatus, selectedYear, paymentHistory, loanHistory, customers]);

  return (
    <div className="min-h-screen bg-[#f1f5f9] font-sans text-slate-900">
      <nav className="bg-white border-b-2 border-indigo-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 h-14 flex justify-between items-center">
          <div className="flex items-center cursor-pointer" onClick={() => { setFilterStatus('all'); setSearchTerm(''); }}>
            <h1 className="text-sm font-black text-slate-900 leading-none">HPG TAX ERP</h1>
            <p className="text-[8px] font-black text-indigo-700 uppercase tracking-widest ml-2">National Portal</p>
          </div>
          <div className="flex-1 max-w-sm mx-6">
            <input type="text" className="w-full pl-4 pr-3 py-2 text-[11px] border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none font-semibold shadow-inner" placeholder="નામ કે ટોકન શોધો..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-2">
               <span className="text-[9px] font-bold text-slate-600">FY:</span>
               <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="text-[11px] font-bold text-indigo-800 bg-transparent outline-none">
                 {Array.from({ length: 10 }, (_, i) => 2024 + i).map(y => <option key={y} value={y}>{y}</option>)}
               </select>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-[1600px] mx-auto px-4 mt-6">
        <StatsCards stats={stats} onFilterChange={(s) => setFilterStatus(s as any)} activeFilter={filterStatus} activeLoanCount={Object.keys(loanHistory).filter(t => getLoanBalance(t) > 0).length} />
        <div className="mt-6 flex flex-col gap-6 pb-12">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[600px]">
            <CustomerTable 
              customers={filteredCustomers} 
              selectedYear={selectedYear} 
              isPaid={(token) => isPaid(token, selectedYear)} 
              getLoanBalance={getLoanBalance}
              calculateCibil={calculateCibilScore}
              onSelectCustomer={(c, mode) => { setSelectedCustomer(c); setModalMode(mode || 'selection'); }} 
            />
          </div>
        </div>
      </main>

      {selectedCustomer && (
        <CustomerModal 
          customer={selectedCustomer} 
          year={selectedYear}
          isAlreadyPaid={isPaid(selectedCustomer.token, selectedYear)}
          existingItems={paymentHistory[selectedCustomer.token]?.[selectedYear]?.items || []}
          outstandingLoans={loanHistory[selectedCustomer.token] || []}
          transactionHistory={transactionLogs[selectedCustomer.token] || []}
          initialMode={modalMode}
          onClose={() => { setSelectedCustomer(null); setModalMode(null); }}
          onPay={(items) => handlePaymentComplete(selectedCustomer.token, selectedYear, items)}
          onGrantLoan={(loan) => handleLoanComplete(selectedCustomer.token, loan)}
          onRepayLoan={(loanId, amount, months) => handleLoanRepayment(selectedCustomer.token, loanId, amount, months)}
          onUpgradeBusinessPlus={() => handleUpgradeBusinessPlus(selectedCustomer.token)}
        />
      )}
    </div>
  );
}

export default App;
