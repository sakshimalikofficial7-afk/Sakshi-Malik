
import React from 'react';
import { Stats } from '../types';

interface StatsCardsProps {
  stats: Stats;
  onFilterChange: (status: string) => void;
  activeFilter: string;
  activeLoanCount: number;
}

const StatsCards: React.FC<StatsCardsProps> = ({ stats, onFilterChange, activeFilter, activeLoanCount }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <CompactStat 
        label="કુલ ગ્રાહકો" 
        value={stats.totalCustomers.toString()} 
        icon="👥"
        color="indigo"
        isActive={activeFilter === 'all'}
        onClick={() => onFilterChange('all')}
      />
      <CompactStat 
        label="ટેક્સ પેઈડ" 
        value={stats.paidCount.toString()} 
        icon="✅"
        color="green"
        isActive={activeFilter === 'paid'}
        onClick={() => onFilterChange('paid')}
      />
      <CompactStat 
        label="ટેક્સ બાકી" 
        value={stats.pendingCount.toString()} 
        icon="⏳"
        color="amber"
        isActive={activeFilter === 'pending'}
        onClick={() => onFilterChange('pending')}
      />
      <CompactStat 
        label="લોન કેસ" 
        value={activeLoanCount.toString()} 
        icon="💳"
        color="orange"
        isActive={activeFilter === 'loan'}
        onClick={() => onFilterChange('loan')}
      />
      <CompactStat 
        label="કુલ લેણું" 
        value={`₹ ${(stats.totalLoansDisbursed / 100000).toFixed(1)}L`} 
        icon="💰"
        color="blue"
        isActive={false}
        onClick={() => {}} 
      />
    </div>
  );
};

const CompactStat: React.FC<{ label: string, value: string, icon: string, color: 'indigo'|'green'|'amber'|'blue'|'orange', isActive: boolean, onClick: () => void }> = ({ label, value, icon, color, isActive, onClick }) => {
  const colorClasses = {
    indigo: 'from-indigo-700 to-indigo-900 shadow-indigo-200 border-indigo-200',
    green: 'from-emerald-700 to-emerald-900 shadow-emerald-200 border-emerald-200',
    amber: 'from-amber-600 to-amber-800 shadow-amber-200 border-amber-200',
    orange: 'from-orange-600 to-orange-800 shadow-orange-200 border-orange-200',
    blue: 'from-blue-700 to-blue-900 shadow-blue-200 border-blue-200'
  };

  return (
    <div 
      onClick={onClick}
      className={`relative cursor-pointer px-4 py-4 rounded-2xl border-2 transition-all duration-300 ${
        isActive 
          ? `bg-gradient-to-br ${colorClasses[color]} text-white border-transparent shadow-xl scale-[1.03] z-10` 
          : 'bg-white border-slate-200 text-slate-900 shadow-sm hover:border-indigo-400 hover:shadow-md'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${isActive ? 'bg-white/20' : 'bg-slate-100'}`}>
          {icon}
        </div>
        <div>
          <p className={`text-[8px] font-bold uppercase tracking-widest mb-0.5 ${isActive ? 'text-white/80' : 'text-slate-600'}`}>{label}</p>
          <h3 className="text-lg font-black tracking-tight">{value}</h3>
        </div>
      </div>
      {isActive && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center border-2 border-indigo-700">
           <div className="w-1.5 h-1.5 bg-indigo-700 rounded-full animate-ping"></div>
        </div>
      )}
    </div>
  );
};

export default StatsCards;
