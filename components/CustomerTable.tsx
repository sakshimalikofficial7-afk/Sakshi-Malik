
import React, { useEffect, useState } from 'react';
import { Customer } from '../types';

interface CustomerTableProps {
  customers: Customer[];
  selectedYear: number;
  isPaid: (token: string) => boolean;
  getLoanBalance: (token: string) => number;
  onSelectCustomer?: (customer: Customer, mode?: any) => void;
  calculateCibil: (token: string) => number;
}

const AnimatedScore: React.FC<{ score: number }> = ({ score }) => {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = score;
    const duration = 800;
    const increment = end / (duration / 16);

    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setDisplayScore(end);
        clearInterval(timer);
      } else {
        setDisplayScore(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [score]);

  const getCibilColor = (s: number) => {
    if (s >= 750) return 'text-emerald-600 bg-emerald-50 border-emerald-100 shadow-emerald-100';
    if (s >= 650) return 'text-amber-600 bg-amber-50 border-amber-100 shadow-amber-100';
    return 'text-red-600 bg-red-50 border-red-100 shadow-red-100';
  };

  return (
    <div className={`inline-flex flex-col items-center px-4 py-1.5 rounded-xl border shadow-sm transition-all duration-300 ${getCibilColor(score)}`}>
      <span className="text-[14px] font-bold leading-none">{displayScore}</span>
      <span className="text-[7px] font-bold uppercase tracking-tight mt-1 opacity-70">TRUST SCORE</span>
    </div>
  );
};

const CustomerTable: React.FC<CustomerTableProps> = ({ customers, selectedYear, isPaid, getLoanBalance, onSelectCustomer, calculateCibil }) => {
  if (customers.length === 0) {
    return (
      <div className="bg-white p-24 text-center">
        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">🔍</div>
        <p className="text-slate-400 text-sm font-semibold uppercase tracking-widest">કોઈ રેકોર્ડ મળ્યા નથી</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead className="sticky top-0 z-10">
          <tr className="bg-slate-900 text-white">
            <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest w-24">Token</th>
            <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest">Payee Name</th>
            <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-center">HPG Score</th>
            <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest">Details</th>
            <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-right">Base Amount</th>
            <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-center">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {customers.map((customer, idx) => {
            const taxPaid = isPaid(customer.token);
            const loanBal = getLoanBalance(customer.token);
            const score = calculateCibil(customer.token);
            
            return (
              <tr 
                key={`${customer.token}-${idx}`} 
                className="hover:bg-indigo-50/40 transition-colors group border-l-4 border-transparent hover:border-indigo-500"
              >
                <td className="px-6 py-4">
                  <span className="text-[11px] font-bold text-indigo-700 font-mono bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100 block text-center shadow-sm">
                    #{customer.token}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div 
                    className="cursor-pointer group/name" 
                    onClick={() => onSelectCustomer?.(customer, 'history')}
                  >
                    <p className="text-[12px] font-bold text-slate-900 uppercase truncate max-w-[180px] group-hover/name:text-indigo-600 transition-colors">
                      {customer.name}
                    </p>
                    <p className="text-[8px] font-semibold text-slate-400 uppercase tracking-tight mt-0.5 group-hover/name:text-indigo-400">વધુ વિગતો માટે ક્લિક કરો →</p>
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <AnimatedScore score={score} />
                </td>
                <td className="px-6 py-4">
                  <p className="text-[10px] font-bold text-slate-800 uppercase leading-none">{customer.taxType}</p>
                  <p className="text-[9px] font-semibold text-slate-400 uppercase mt-1">{customer.district}</p>
                </td>
                <td className="px-6 py-4 text-[12px] font-bold text-slate-900 text-right font-mono">₹ {customer.price}</td>
                <td className="px-6 py-4">
                  <div className="flex flex-col items-center gap-2 max-w-[120px] mx-auto">
                    {loanBal > 0 && (
                      <button 
                        onClick={() => onSelectCustomer?.(customer, 'loan_repayment')}
                        className="w-full bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-[8px] font-bold uppercase shadow-md hover:bg-emerald-500 transition-all active:scale-90 border-b-2 border-emerald-800"
                      >
                        ⚡ EMI ભરો
                      </button>
                    )}
                    
                    <button 
                      onClick={() => onSelectCustomer?.(customer, taxPaid ? 'receipt' : 'tax_billing')}
                      className={`w-full px-3 py-1.5 rounded-lg text-[8px] font-bold uppercase transition-all shadow-sm active:scale-90 border-b-2 ${taxPaid ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-indigo-700 text-white hover:bg-indigo-600 border-indigo-900'}`}
                    >
                      {taxPaid ? 'રસીદ જુઓ' : 'ટેક્સ ફાઈલ'}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default CustomerTable;
