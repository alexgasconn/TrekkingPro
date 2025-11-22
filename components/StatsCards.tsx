import React from 'react';
import { RouteStats } from '../types';
import { Mountain, ArrowUpRight, ArrowDownRight, Activity, ArrowDown } from 'lucide-react';

interface StatsCardsProps {
  stats: RouteStats;
}

const StatCard = ({ icon: Icon, label, value, subtext, colorClass }: any) => (
  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-start space-x-3 transition-transform hover:-translate-y-1">
    <div className={`p-2.5 rounded-lg ${colorClass} bg-opacity-10 shrink-0`}>
      <Icon className={`w-5 h-5 ${colorClass.replace('bg-', 'text-')}`} />
    </div>
    <div className="min-w-0">
      <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">{label}</p>
      <h4 className="text-lg font-bold text-slate-800 truncate">{value}</h4>
      {subtext && <p className="text-[10px] text-slate-400 mt-0.5 truncate">{subtext}</p>}
    </div>
  </div>
);

const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
      <StatCard 
        icon={Activity}
        label="Distance"
        value={`${stats.totalDistance.toFixed(1)} km`}
        subtext="Total Length"
        colorClass="bg-blue-500 text-blue-600"
      />
      <StatCard 
        icon={ArrowUpRight}
        label="Gain"
        value={`+${stats.elevationGain} m`}
        subtext="Total Ascent"
        colorClass="bg-emerald-500 text-emerald-600"
      />
      <StatCard 
        icon={ArrowDownRight}
        label="Loss"
        value={`-${stats.elevationLoss} m`}
        subtext="Total Descent"
        colorClass="bg-amber-500 text-amber-600"
      />
       <StatCard 
        icon={Mountain}
        label="Max Alt"
        value={`${stats.maxElevation} m`}
        subtext="Peak Point"
        colorClass="bg-indigo-500 text-indigo-600"
      />
      <StatCard 
        icon={ArrowDown}
        label="Min Alt"
        value={`${stats.minElevation} m`}
        subtext="Lowest Point"
        colorClass="bg-cyan-500 text-cyan-600"
      />
    </div>
  );
};

export default StatsCards;