import React from 'react';
import { RouteStats } from '../types';
import { Mountain, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';

interface StatsCardsProps {
  stats: RouteStats;
}

const StatCard = ({ icon: Icon, label, value, subtext, colorClass }: any) => (
  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-start space-x-4">
    <div className={`p-3 rounded-lg ${colorClass} bg-opacity-10`}>
      <Icon className={`w-6 h-6 ${colorClass.replace('bg-', 'text-')}`} />
    </div>
    <div>
      <p className="text-slate-500 text-sm font-medium">{label}</p>
      <h4 className="text-xl font-bold text-slate-800">{value}</h4>
      {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
    </div>
  </div>
);

const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatCard 
        icon={Activity}
        label="Total Distance"
        value={`${stats.totalDistance.toFixed(1)} km`}
        subtext="Horizontal length"
        colorClass="bg-blue-500 text-blue-600"
      />
      <StatCard 
        icon={ArrowUpRight}
        label="Elevation Gain"
        value={`+${stats.elevationGain} m`}
        subtext="Total ascent"
        colorClass="bg-emerald-500 text-emerald-600"
      />
      <StatCard 
        icon={ArrowDownRight}
        label="Elevation Loss"
        value={`-${stats.elevationLoss} m`}
        subtext="Total descent"
        colorClass="bg-amber-500 text-amber-600"
      />
       <StatCard 
        icon={Mountain}
        label="Max Altitude"
        value={`${stats.maxElevation} m`}
        subtext={`Min: ${stats.minElevation} m`}
        colorClass="bg-indigo-500 text-indigo-600"
      />
    </div>
  );
};

export default StatsCards;