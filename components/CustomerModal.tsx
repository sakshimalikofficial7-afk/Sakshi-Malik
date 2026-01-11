
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Customer, LineItem, LoanRecord, TransactionLog } from '../types';

interface CustomerModalProps {
  customer: Customer;
  year: number;
  isAlreadyPaid: boolean;
  existingItems: LineItem[];
  outstandingLoans: LoanRecord[];
  transactionHistory?: TransactionLog[];
  onClose: () => void;
  onPay?: (items: LineItem[]) => void;
  onGrantLoan?: (loan: LoanRecord) => void;
  onRepayLoan?: (loanId: string, amount: number, months: number) => void;
  onUpgradeBusinessPlus?: () => void;
  initialMode?: any;
}

const formatAmountInWords = (num: number): string => {
  if (num === 0) return "Zero";
  const words = [];
  if (num >= 10000000) {
    words.push(`${Math.floor(num / 10000000)} Crore`);
    num %= 10000000;
  }
  if (num >= 100000) {
    words.push(`${Math.floor(num / 100000)} Lakh`);
    num %= 100000;
  }
  if (num >= 1000) {
    words.push(`${Math.floor(num / 1000)} Thousand`);
    num %= 1000;
  }
  if (num > 0) words.push(`${num}`);
  return words.join(" ") + " Only";
};

const SuccessScreen: React.FC<{ message: string }> = ({ message }) => (
  <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-slate-900/95 backdrop-blur-md animate-in fade-in duration-300">
    <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg animate-in zoom-in duration-500">
      <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" className="animate-draw-check" />
      </svg>
    </div>
    <h3 className="text-white text-2xl font-bold mt-6 uppercase tracking-tight">{message}</h3>
    <p className="text-emerald-400 text-[10px] font-bold uppercase mt-2 tracking-widest">HPG NATIONAL PORTAL</p>
  </div>
);

const CustomerModal: React.FC<CustomerModalProps> = ({ 
  customer, year, isAlreadyPaid, existingItems, outstandingLoans, transactionHistory = [],
  onClose, onPay, onGrantLoan, onRepayLoan, onUpgradeBusinessPlus, initialMode
}) => {
  const [mode, setMode] = useState<'selection' | 'tax_billing' | 'loan_billing' | 'loan_repayment' | 'receipt' | 'loan_sanction' | 'repayment_receipt' | 'daily_upgrade' | 'daily_loan' | 'daily_repayment' | 'history'>(initialMode || (isAlreadyPaid ? 'receipt' : 'selection'));
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>(existingItems);
  const [loanName, setLoanName] = useState("Business Capital");
  const [loanAmount, setLoanAmount] = useState(100000);
  const [interestRate, setInterestRate] = useState(12.0);
  const [duration, setDuration] = useState(12);
  const [repaymentCycle, setRepaymentCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [sanctionedLoan, setSanctionedLoan] = useState<LoanRecord | null>(null);
  const [selectedLoanId, setSelectedLoanId] = useState('');
  const [tempSelectedMonths, setTempSelectedMonths] = useState<number[]>([]);
  const [lastRepayment, setLastRepayment] = useState<any>(null);

  const receiptRef = useRef<HTMLDivElement>(null);
  const activeLoans = useMemo(() => outstandingLoans.filter(l => !l.isRepaid), [outstandingLoans]);
  const activeDailyLoans = useMemo(() => activeLoans.filter(l => l.loanType === 'daily'), [activeLoans]);
  const activeRegularLoans = useMemo(() => activeLoans.filter(l => l.loanType !== 'daily'), [activeLoans]);

  const businessPlusConfig: Record<string, number> = { 'BSHPG TAX': 49500, 'HNCG TAX': 69500, 'MCLBSG TAX': 78900 };
  const isEligibleForPlus = !!businessPlusConfig[customer.taxType];
  const plusUpgradePrice = businessPlusConfig[customer.taxType] || 0;

  const taxPresets: LineItem[] = [
    { label: "Bhakti Medicine Insurance", amount: 14500 },
    { label: "Pathan Charitable Trust", amount: 34900 },
    { label: "Sakshi SKHM", amount: 3200 },
    { label: "Nora Info Tech", amount: 5700 },
    { label: "Swaminarayan Juna Mandir", amount: 2100 },
    { label: "BAPS Swaminarayan", amount: 3900 },
    { label: "GST", amount: 6800 },
    { label: "SGST", amount: 1800 }
  ];

  const currentEmi = useMemo(() => {
    const totalInt = (loanAmount * interestRate * (duration / 12)) / 100;
    return Math.round((loanAmount + totalInt) / duration);
  }, [loanAmount, interestRate, duration]);

  const getPenaltyInfo = (loan: LoanRecord) => {
    const loanDate = new Date(loan.date);
    const today = new Date();
    const elapsedMonths = (today.getFullYear() - loanDate.getFullYear()) * 12 + (today.getMonth() - loanDate.getMonth());
    const overdueCount = Math.max(0, elapsedMonths - loan.paidMonths);
    const emi = Math.round(loan.totalRepayment / loan.durationMonths);
    const monthlyPenalty = Math.round(emi * 0.02);
    return { overdueCount, monthlyPenalty, totalPenalty: overdueCount * monthlyPenalty };
  };

  const triggerSuccess = (msg: string, nextMode: any) => {
    setSuccessMessage(msg);
    setShowSuccess(true);
    setTimeout(() => { setShowSuccess(false); setMode(nextMode); }, 1200);
  };

  const handleUpgradePayment = () => {
    setLoading(true);
    setTimeout(() => {
      onUpgradeBusinessPlus?.();
      onPay?.([{ label: `Daily Mode Activation Fee (${customer.taxType})`, amount: plusUpgradePrice }]);
      setLoading(false);
      triggerSuccess("DAILY MODE ACTIVE", 'selection');
    }, 800);
  };

  const handleGrantLoan = (type: 'regular' | 'daily') => {
    const totalInt = (loanAmount * interestRate * (duration / 12)) / 100;
    const loan: LoanRecord = {
      id: Math.random().toString(36).substr(2, 6).toUpperCase(),
      name: type === 'daily' ? `${loanName}` : `Regular Yearly Loan`,
      amount: loanAmount, interestRate, durationMonths: duration, paidMonths: 0,
      totalRepayment: loanAmount + totalInt, paidAmount: 0, 
      date: new Date().toLocaleDateString(), isRepaid: false,
      loanType: type, repaymentCycle: type === 'daily' ? repaymentCycle : 'monthly'
    };
    setLoading(true);
    setTimeout(() => {
      onGrantLoan?.(loan);
      setSanctionedLoan(loan);
      setLoading(false);
      triggerSuccess(type === 'daily' ? "CAPITAL RELEASED" : "LOAN GRANTED", 'loan_sanction');
    }, 800);
  };

  const handleRepaymentSubmit = () => {
    if (!selectedLoanId || tempSelectedMonths.length === 0) return;
    const loan = outstandingLoans.find(l => l.id === selectedLoanId);
    if (!loan) return;
    const emi = Math.round(loan.totalRepayment / loan.durationMonths);
    const { monthlyPenalty } = getPenaltyInfo(loan);
    const finalAmount = (emi + (getPenaltyInfo(loan).overdueCount > 0 ? monthlyPenalty : 0)) * tempSelectedMonths.length;
    setLoading(true);
    setTimeout(() => {
      onRepayLoan?.(selectedLoanId, finalAmount, tempSelectedMonths.length);
      setLastRepayment({ loan, amount: finalAmount, months: tempSelectedMonths.length, penalty: (getPenaltyInfo(loan).overdueCount > 0 ? monthlyPenalty : 0) * tempSelectedMonths.length });
      setLoading(false);
      triggerSuccess("EMI RECOVERY SUCCESS", 'repayment_receipt');
    }, 600);
  };

  const handleFinalPayment = () => {
    setLoading(true);
    setTimeout(() => {
      onPay?.(lineItems);
      setLoading(false);
      triggerSuccess("VOUCHER GENERATED", 'receipt');
    }, 800);
  };

  const downloadAsImage = () => {
    if (!receiptRef.current) return;
    const h2c = (window as any).html2canvas;
    setLoading(true);
    h2c(receiptRef.current, { backgroundColor: '#f3efd9', scale: 2 }).then((canvas: any) => {
      const link = document.createElement('a');
      link.download = `HPG_${customer.token}_${mode}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      setLoading(false);
    });
  };

  if (showSuccess) return <SuccessScreen message={successMessage} />;

  if (mode === 'history') {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md">
        <div className="bg-white w-full max-w-xl rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in h-[700px]">
          <div className="bg-slate-950 p-6 text-white flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold uppercase leading-none">{customer.name}</h3>
              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Complete Transaction History</p>
            </div>
            <button onClick={() => setMode('selection')} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20">✕</button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-50">
            {transactionHistory.length > 0 ? (
              <div className="space-y-4">
                {transactionHistory.map((log) => (
                  <div key={log.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex gap-4 animate-in slide-in-from-bottom-2">
                    <div className={`w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center text-xl 
                      ${log.type === 'TAX_PAYMENT' ? 'bg-indigo-50 text-indigo-600' : 
                        log.type === 'LOAN_CREDIT' ? 'bg-emerald-50 text-emerald-600' : 
                        log.type === 'EMI_DEBIT' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-600'}`}>
                      {log.type === 'TAX_PAYMENT' ? '📄' : log.type === 'LOAN_CREDIT' ? '🏦' : log.type === 'EMI_DEBIT' ? '📥' : '⚡'}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{log.date}</p>
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase
                          ${log.type === 'TAX_PAYMENT' ? 'bg-indigo-100 text-indigo-700' : 
                            log.type === 'LOAN_CREDIT' ? 'bg-emerald-100 text-emerald-700' : 
                            log.type === 'EMI_DEBIT' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-700'}`}>
                          {log.type.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-[13px] font-bold text-slate-900 mb-1">{log.description}</p>
                      <div className="flex items-center justify-between">
                        <p className="text-[14px] font-bold text-slate-950">₹ {log.amount.toLocaleString()}</p>
                        <p className="text-[8px] font-semibold text-slate-400 uppercase italic max-w-[200px] text-right">{formatAmountInWords(log.amount)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                <span className="text-6xl mb-4">📂</span>
                <p className="font-bold uppercase tracking-widest text-sm">No Transactions Recorded Yet</p>
              </div>
            )}
          </div>
          <div className="p-4 bg-white border-t border-slate-100">
            <button onClick={() => setMode('selection')} className="w-full py-4 bg-slate-900 text-white font-bold text-xs uppercase rounded-xl active:scale-95 transition-all">Back to Dashboard</button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'selection') {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
        <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 text-center shadow-xl border border-slate-200 animate-in zoom-in duration-300">
           <div className="mb-6">
              {customer.businessPlusActive && (
                <div className="flex justify-center mb-3">
                   <span className="bg-amber-100 text-amber-700 text-[9px] font-bold px-4 py-1.5 rounded-full border border-amber-200 uppercase tracking-widest">Premium Daily Capital Active</span>
                </div>
              )}
              <h3 className="text-xl font-bold text-slate-950 uppercase">{customer.name}</h3>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-1">{customer.taxType} PORTAL</p>
           </div>
           
           <div className="grid grid-cols-1 gap-3">
              <button onClick={() => setMode('history')} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all text-left">
                 <span className="text-xl">📜</span>
                 <div>
                    <p className="text-[11px] font-bold uppercase text-slate-700">Transaction History</p>
                    <p className="text-[8px] font-semibold text-slate-400 uppercase">ચેક કરો બધી ટ્રાન્ઝેક્શન વિગત</p>
                 </div>
              </button>

              {customer.businessPlusActive ? (
                <button onClick={() => setMode('daily_loan')} className="flex items-center gap-4 p-5 bg-amber-500 text-white rounded-2xl hover:bg-amber-600 transition-all shadow-lg active:scale-95 text-left group">
                   <span className="text-2xl">💰</span>
                   <div>
                     <p className="text-[13px] font-bold uppercase leading-tight">Apply Daily Capital</p>
                     <p className="text-[8px] font-semibold text-amber-100 uppercase">નવી રોકડ સહાય મેળવો</p>
                   </div>
                </button>
              ) : isEligibleForPlus ? (
                <button onClick={() => setMode('daily_upgrade')} className="flex items-center gap-4 p-5 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all shadow-lg active:scale-95 text-left border-2 border-indigo-500/30">
                   <span className="text-2xl">🌟</span>
                   <div>
                     <p className="text-[13px] font-bold uppercase leading-tight">Activate Daily Mode</p>
                     <p className="text-[8px] font-semibold text-indigo-400 uppercase">દરરોજ લોન માટે મોડ ચાલુ કરો</p>
                   </div>
                </button>
              ) : null}

              <button onClick={() => setMode('tax_billing')} className="flex items-center gap-4 p-5 bg-indigo-50 rounded-2xl hover:bg-indigo-100 transition-all shadow-sm active:scale-95 text-left border border-indigo-100 group">
                 <span className="text-2xl">📄</span>
                 <p className="text-[13px] font-bold uppercase text-indigo-900">ટેક્સ પોર્ટલ (Tax Portal)</p>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => { setMode('loan_repayment'); setTempSelectedMonths([]); }} className="flex flex-col items-center gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 transition-all active:scale-95">
                   <span className="text-xl">📅</span>
                   <p className="text-[8px] font-bold uppercase text-center text-slate-600">Regular EMI<br/>વર્ષના હપ્તા</p>
                </button>
                <button 
                  disabled={!customer.businessPlusActive}
                  onClick={() => { setMode('daily_repayment'); setTempSelectedMonths([]); }} 
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all active:scale-95 ${customer.businessPlusActive ? 'bg-amber-50 border-amber-200 hover:bg-amber-100' : 'bg-slate-100 border-slate-200 opacity-50 grayscale'}`}
                >
                   <span className="text-xl">⚡</span>
                   <p className="text-[8px] font-bold uppercase text-center text-amber-900">Daily EMI<br/>રોકાણના હપ્તા</p>
                </button>
              </div>

              <button onClick={() => setMode('loan_billing')} className="flex items-center gap-4 p-4 bg-white rounded-2xl hover:bg-slate-50 transition-all shadow-sm active:scale-95 text-left border border-slate-100">
                 <span className="text-2xl">🏦</span>
                 <p className="text-[12px] font-bold uppercase text-slate-600">Apply Yearly Loan</p>
              </button>
           </div>
           <button onClick={onClose} className="mt-8 text-[11px] font-bold uppercase text-slate-300 hover:text-red-500 transition-colors">CLOSE ✕</button>
        </div>
      </div>
    );
  }

  if (mode === 'daily_upgrade') {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md">
        <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-xl border-4 border-indigo-600 animate-in zoom-in">
           <button onClick={() => setMode('selection')} className="text-[10px] font-bold uppercase text-slate-400 mb-6 hover:text-slate-900">← પાછા જાઓ (Back)</button>
           <h2 className="text-2xl font-bold text-slate-900 leading-tight uppercase mb-2">Daily Capital<br/>Plan Activation</h2>
           <p className="text-slate-500 text-[10px] font-semibold uppercase mb-6">નવી સરકારી યોજના: BSHPG, HNCG, MCLBSG ગ્રાહકો માટે ધંધામાં સહાય.</p>
           
           <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 mb-6">
              <p className="text-[10px] font-bold text-indigo-800 uppercase mb-1">Activation Mode Charge</p>
              <h3 className="text-4xl font-bold text-indigo-950">₹ {plusUpgradePrice.toLocaleString()}</h3>
              <p className="text-[9px] font-semibold text-indigo-600 mt-1 uppercase italic tracking-tighter">({formatAmountInWords(plusUpgradePrice)})</p>
              
              <div className="mt-5 space-y-2">
                 {["રોજે-રોજ બિઝનેસ લોન", "મહિના કે વર્ષના હપ્તા", "૧૨% વ્યાજ દર"].map(f => (
                   <div key={f} className="flex items-center gap-3 text-[10px] font-bold text-indigo-700 uppercase">
                     <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div> {f}
                   </div>
                 ))}
              </div>
           </div>

           <button onClick={handleUpgradePayment} disabled={loading} className="w-full py-4 bg-indigo-700 text-white font-bold text-sm uppercase rounded-xl shadow-lg active:scale-95 transition-all">
             {loading ? 'PROCESSING...' : 'Pay & Activate Mode ✅'}
           </button>
        </div>
      </div>
    );
  }

  if (mode === 'daily_loan' || mode === 'loan_billing') {
    const isDaily = mode === 'daily_loan';
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md">
        <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-xl border-t-8 border-indigo-600 animate-in zoom-in">
           <button onClick={() => setMode('selection')} className="text-[10px] font-bold uppercase text-slate-400 mb-6 flex items-center gap-2">← પાછા જાઓ</button>
           <h2 className="text-2xl font-bold text-slate-900 uppercase mb-6 flex items-center gap-3">{isDaily ? '⚡ Business Capital' : '🏦 Asset Loan'}</h2>
           
           <div className="space-y-4">
              <div>
                <label className="text-[9px] font-bold uppercase text-slate-500 mb-1 block pl-2">Loan Principal (₹)</label>
                <input type="number" value={loanAmount} onChange={(e) => setLoanAmount(parseInt(e.target.value) || 0)} className="w-full py-3 px-5 bg-slate-50 border border-slate-200 rounded-xl text-2xl font-bold outline-none focus:border-indigo-600 transition-all text-center" />
                <p className="text-[8px] font-bold text-indigo-700 text-center mt-2 uppercase italic">{formatAmountInWords(loanAmount)}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                 <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                   <label className="text-[8px] font-bold uppercase text-slate-500 mb-1 block text-center">Duration (Mo)</label>
                   <input type="number" value={duration} onChange={(e) => setDuration(parseInt(e.target.value))} className="w-full bg-transparent text-xl font-bold text-center outline-none" />
                 </div>
                 <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                   <label className="text-[8px] font-bold uppercase text-slate-500 mb-1 block text-center">Cycle</label>
                   <select value={repaymentCycle} onChange={(e) => setRepaymentCycle(e.target.value as any)} className="w-full bg-transparent text-[10px] font-bold text-center outline-none uppercase">
                     <option value="monthly">Monthly</option>
                     <option value="yearly">Yearly</option>
                   </select>
                 </div>
              </div>

              <div className="bg-slate-900 p-6 rounded-2xl text-white shadow-lg text-center">
                 <p className="text-[9px] font-semibold text-slate-400 uppercase mb-1 tracking-widest">Monthly EMI (હપ્તો)</p>
                 <h4 className="text-2xl font-bold text-emerald-400">₹ {currentEmi.toLocaleString()}</h4>
                 <div className="h-px bg-white/10 my-3"></div>
                 <p className="text-[9px] font-semibold text-slate-400 uppercase mb-1 tracking-widest">Total Repayable</p>
                 <h4 className="text-xl font-bold">₹ {(loanAmount + (loanAmount * 0.12)).toLocaleString()}</h4>
              </div>
           </div>

           <button onClick={() => handleGrantLoan(isDaily ? 'daily' : 'regular')} disabled={loading} className="w-full mt-6 py-4 bg-indigo-700 text-white font-bold text-sm uppercase rounded-xl shadow-lg active:scale-95 transition-all">
             {loading ? 'SANCTIONING...' : 'Approve & Release ✅'}
           </button>
        </div>
      </div>
    );
  }

  if (mode === 'tax_billing') {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md">
        <div className="bg-white w-full max-w-4xl h-[600px] rounded-[2rem] overflow-hidden flex shadow-2xl animate-in zoom-in">
           <div className="w-64 bg-slate-900 p-6 text-white overflow-y-auto custom-scrollbar">
              <button onClick={() => setMode('selection')} className="w-full py-3 mb-6 bg-slate-800 hover:bg-slate-700 transition-colors rounded-xl text-[10px] font-bold uppercase">← પાછા જાઓ</button>
              <h4 className="text-[10px] font-bold uppercase text-indigo-400 mb-4 tracking-widest">Select Taxes</h4>
              <div className="space-y-2">
                 {taxPresets.map(p => (
                   <button key={p.label} onClick={() => setLineItems([...lineItems, p])} className="w-full text-left p-3 rounded-xl bg-slate-800 hover:bg-indigo-600 transition-all text-[10px] font-bold border border-white/5 group">
                     <p className="group-hover:text-white">{p.label}</p>
                     <p className="text-indigo-400 mt-1 font-mono group-hover:text-white">₹ {p.amount.toLocaleString()}</p>
                   </button>
                 ))}
              </div>
           </div>
           
           <div className="flex-1 p-8 flex flex-col bg-white overflow-hidden">
              <div className="flex justify-between items-start mb-6">
                 <div>
                    <h2 className="text-2xl font-bold uppercase text-slate-950 leading-tight">{customer.name}</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Assessment FY {year}</p>
                 </div>
                 <div className="bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100 text-center">
                    <p className="text-[8px] font-bold text-indigo-700 uppercase">Token</p>
                    <p className="text-lg font-bold text-slate-900 font-mono">#{customer.token}</p>
                 </div>
              </div>

              <div className="flex-1 overflow-y-auto border border-slate-100 rounded-2xl mb-6 bg-slate-50/50 p-4 custom-scrollbar">
                 <table className="w-full text-[11px] border-collapse">
                    <thead className="sticky top-0 bg-white font-bold z-10">
                      <tr className="border-b border-slate-200 text-slate-400">
                        <th className="p-3 text-left uppercase tracking-widest">Description</th>
                        <th className="p-3 text-right uppercase tracking-widest">Amt (₹)</th>
                        <th className="p-3 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="font-semibold text-slate-700">
                       <tr className="border-b border-slate-100 bg-white">
                          <td className="p-3 uppercase font-bold text-slate-950">{customer.taxType} REG. FEE</td>
                          <td className="p-3 text-right font-bold">₹ {parseInt(customer.price.replace(/[^\d]/g, '')).toLocaleString()}</td>
                          <td></td>
                       </tr>
                       {lineItems.map((it, i) => (
                         <tr key={i} className="border-b border-slate-100 animate-in slide-in-from-right-2">
                            <td className="p-3 uppercase">{it.label}</td>
                            <td className="p-3 text-right font-bold">₹ {it.amount.toLocaleString()}.00</td>
                            <td className="p-3 text-center">
                               <button onClick={() => setLineItems(lineItems.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600 transition-colors">✕</button>
                            </td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
              </div>

              <div className="bg-slate-950 rounded-2xl p-6 flex justify-between items-center text-white shadow-xl relative overflow-hidden">
                 <div>
                   <p className="text-[9px] font-bold uppercase text-indigo-400 mb-1 tracking-widest">Grand Total</p>
                   <p className="text-3xl font-bold">₹ {(lineItems.reduce((acc, c) => acc + c.amount, 0) + parseInt(customer.price.replace(/[^\d]/g, ''))).toLocaleString()}/-</p>
                   <p className="text-[8px] font-semibold text-slate-500 mt-1 uppercase italic">{formatAmountInWords(lineItems.reduce((acc, c) => acc + c.amount, 0) + parseInt(customer.price.replace(/[^\d]/g, '')))}</p>
                 </div>
                 <button onClick={handleFinalPayment} disabled={loading} className="px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase rounded-xl transition-all shadow-lg active:scale-95">
                   {loading ? 'PROCESSING...' : 'Issue Voucher 📄'}
                 </button>
              </div>
           </div>
        </div>
      </div>
    );
  }

  if (mode === 'loan_repayment' || mode === 'daily_repayment') {
    const isDaily = mode === 'daily_repayment';
    const loans = isDaily ? activeDailyLoans : activeRegularLoans;
    const loan = loans.find(l => l.id === selectedLoanId) || loans[0];
    const penaltyInfo = loan ? getPenaltyInfo(loan) : { overdueCount: 0, monthlyPenalty: 0, totalPenalty: 0 };
    
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md">
        <div className="bg-white w-full max-w-md rounded-[2rem] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4">
          <div className={`${isDaily ? 'bg-amber-600' : 'bg-emerald-700'} p-6 text-white flex justify-between items-center`}>
            <h3 className="text-sm font-bold uppercase">{isDaily ? 'Daily Recovery' : 'Yearly Recovery'}</h3>
            <button onClick={() => setMode('selection')} className="w-8 h-8 rounded-full bg-black/10 flex items-center justify-center text-lg">✕</button>
          </div>
          <div className="p-8">
            <button onClick={() => setMode('selection')} className="text-[10px] font-bold uppercase text-slate-400 mb-4">← પાછા જાઓ</button>
            {loans.length > 0 ? (
              <div className="space-y-6">
                <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                   {loans.map(l => (
                     <div key={l.id} onClick={() => { setSelectedLoanId(l.id); setTempSelectedMonths([]); }} className={`flex-shrink-0 p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedLoanId === l.id ? (isDaily ? 'border-amber-600 bg-amber-50' : 'border-emerald-600 bg-emerald-50') : 'border-slate-100 bg-white'}`}>
                        <p className="text-[10px] font-bold uppercase truncate w-24">{l.name}</p>
                        <p className="text-[8px] font-semibold text-slate-400 mt-1">{l.paidMonths}/{l.durationMonths} MO</p>
                     </div>
                   ))}
                </div>
                
                {loan && (
                  <div>
                    {penaltyInfo.overdueCount > 0 && (
                      <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-xl text-red-900 flex justify-between items-center">
                         <div>
                           <p className="text-[11px] font-bold uppercase leading-none mb-1">Penalty Active</p>
                           <p className="text-[8px] font-semibold opacity-70">₹ {penaltyInfo.monthlyPenalty} per installment</p>
                         </div>
                         <p className="text-xl font-bold">₹ {penaltyInfo.totalPenalty.toLocaleString()}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-4 gap-2 mb-6 max-h-40 overflow-y-auto p-1 custom-scrollbar">
                      {Array.from({ length: loan.durationMonths }).map((_, i) => {
                        const isPaid = i < loan.paidMonths;
                        const isSelected = tempSelectedMonths.includes(i);
                        return (
                          <button key={i} disabled={isPaid} onClick={() => setTempSelectedMonths(prev => prev.includes(i) ? prev.filter(m => m !== i) : [...prev, i])} className={`py-3 rounded-lg text-[10px] font-bold border transition-all ${isPaid ? 'bg-slate-100 border-slate-100 text-slate-400 grayscale' : isSelected ? (isDaily ? 'bg-amber-600 border-amber-600 text-white shadow-md' : 'bg-emerald-600 border-emerald-600 text-white shadow-md') : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-400'}`}>MO {i + 1}</button>
                        );
                      })}
                    </div>
                    
                    <div className="bg-slate-950 rounded-2xl p-6 flex justify-between items-center text-white shadow-lg">
                       <div>
                          <p className="text-[9px] font-semibold text-slate-400 uppercase mb-1">Collect Amount</p>
                          <p className={`text-3xl font-bold ${isDaily ? 'text-amber-400' : 'text-emerald-400'}`}>₹ {((Math.round(loan.totalRepayment / loan.durationMonths) + (penaltyInfo.overdueCount > 0 ? penaltyInfo.monthlyPenalty : 0)) * tempSelectedMonths.length).toLocaleString()}</p>
                       </div>
                       <button onClick={handleRepaymentSubmit} disabled={tempSelectedMonths.length === 0} className={`px-8 py-4 ${isDaily ? 'bg-amber-600 hover:bg-amber-500' : 'bg-emerald-600 hover:bg-emerald-500'} text-white font-bold text-xs uppercase rounded-xl transition-all shadow-lg active:scale-95`}>PAY 📥</button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-100">
                <p className="text-slate-300 font-bold uppercase text-[10px]">No Active Loans</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'receipt' || mode === 'loan_sanction' || mode === 'repayment_receipt') {
    const totalRaw = mode === 'loan_sanction' ? sanctionedLoan?.totalRepayment : mode === 'repayment_receipt' ? lastRepayment?.amount : lineItems.reduce((acc, c) => acc + c.amount, 0) + parseInt(customer.price.replace(/[^\d]/g, ''));
    return (
      <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md overflow-y-auto flex flex-col items-center pt-10 pb-20 custom-scrollbar">
        <div ref={receiptRef} className="paper-khaki p-10 border-4 border-black font-typewriter shadow-2xl w-full max-w-lg mb-10 relative overflow-hidden animate-in slide-in-from-top-4 duration-500">
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none transform -rotate-45">
             <h1 className="text-9xl font-bold">HPG-ERP</h1>
           </div>
           
           <div className="text-center border-b-2 border-black pb-6 mb-8">
              <h4 className="text-xl font-bold uppercase tracking-[0.2em] mb-2">OFFICIAL VOUCHER</h4>
              <p className="text-[12px] font-bold">FY {year} | TOKEN: {customer.token}</p>
           </div>
           
           <div className="text-[13px] space-y-3 mb-10 relative z-10">
              <div className="flex justify-between border-b border-black/10 pb-2"><span>PAYEE NAME:</span> <span className="font-bold text-right">{customer.name}</span></div>
              <div className="flex justify-between border-b border-black/10 pb-2"><span>TRANS:</span> <span className="font-bold uppercase">{mode.replace(/_/g, ' ')}</span></div>
              
              {mode === 'repayment_receipt' && lastRepayment && (
                <div className="bg-black/5 p-4 rounded-xl space-y-2 border border-black/10">
                   <div className="flex justify-between"><span>Loan Asset:</span> <span className="font-bold">{lastRepayment.loan.name}</span></div>
                   <div className="flex justify-between"><span>Months:</span> <span className="font-bold">{lastRepayment.months} Terms</span></div>
                   {lastRepayment.penalty > 0 && <div className="flex justify-between text-red-800"><span>Penalty:</span> <span className="font-bold">₹ {lastRepayment.penalty.toLocaleString()}</span></div>}
                </div>
              )}

              {mode === 'loan_sanction' && sanctionedLoan && (
                <div className="bg-black/5 p-4 rounded-xl space-y-2 border border-black/10">
                   <div className="flex justify-between"><span>Amt:</span> <span className="font-bold">₹ {sanctionedLoan.amount.toLocaleString()}</span></div>
                   <div className="flex justify-between"><span>Cycle:</span> <span className="uppercase font-bold">{sanctionedLoan.repaymentCycle}</span></div>
                </div>
              )}

              {mode === 'receipt' && (
                <div className="py-2 space-y-2">
                   <div className="flex justify-between text-black/60"><span>Base Fee</span> <span className="font-bold">₹ {parseInt(customer.price.replace(/[^\d]/g, '')).toLocaleString()}</span></div>
                   {lineItems.map((li, i) => (
                     <div key={i} className="flex justify-between"><span>{li.label}</span> <span className="font-bold">₹ {li.amount.toLocaleString()}</span></div>
                   ))}
                </div>
              )}

              <div className="bg-black/10 p-8 rounded-[2rem] mt-8 border-2 border-black flex flex-col items-center justify-center">
                 <span className="font-bold uppercase text-[9px] mb-2 opacity-60">NET ASSESSMENT</span>
                 <h2 className="font-bold text-5xl">₹ {totalRaw?.toLocaleString()}/-</h2>
                 <p className="text-[8px] font-bold mt-4 uppercase tracking-tighter border-t border-black/20 pt-3 w-full text-center">
                    Words: {formatAmountInWords(totalRaw || 0)}
                 </p>
              </div>
           </div>
           
           <div className="mt-12 flex justify-between items-end">
              <div className="rubber-stamp-circular scale-[1.1] opacity-90">
                <span className="mb-1 text-[7px] font-bold">APPROVED</span>
                <span className="text-[16px] font-bold tracking-tighter">HPG ERP</span>
                <span className="mt-1 text-[7px] font-bold">OFFICIAL</span>
              </div>
              <div className="text-center w-36 border-t border-black pt-4 font-bold">
                <p className="font-signature text-3xl text-slate-800 mb-2">A. Pathan</p>
                <p className="text-[9px] uppercase tracking-widest opacity-60">Controller</p>
              </div>
           </div>
        </div>
        
        <div className="flex flex-col gap-3 w-full max-w-lg px-6 no-print">
           <button onClick={downloadAsImage} className="w-full py-5 bg-indigo-700 text-white font-bold text-sm uppercase rounded-xl shadow-xl flex items-center justify-center gap-4 transition-all active:scale-95">
             {loading ? 'તૈયાર થઈ રહ્યું છે...' : <><span>📥</span> ડાઉનલોડ રસીદ (Download)</>}
           </button>
           <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setMode('selection')} className="py-4 bg-slate-800 text-white font-bold text-[10px] uppercase rounded-xl shadow-lg active:scale-95 transition-all">← પાછા જાઓ</button>
              <button onClick={onClose} className="py-4 bg-red-700 text-white font-bold text-[10px] uppercase rounded-xl shadow-lg active:scale-95 transition-all">✕ EXIT</button>
           </div>
        </div>
      </div>
    );
  }

  return null;
};

export default CustomerModal;
