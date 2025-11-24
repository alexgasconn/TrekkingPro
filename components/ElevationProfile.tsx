
import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceDot } from 'recharts';
import { GPXPoint } from '../types';
import { Activity } from 'lucide-react';

interface ElevationProfileProps {
  rawPoints: GPXPoint[]; // Needed for global Min/Max calculation stability
  smoothedPoints: GPXPoint[]; // The data to display
  smoothingLevel: number;
  setSmoothingLevel: (l: number) => void;
  hoveredPoint: GPXPoint | null;
  onHoverPoint: (point: GPXPoint | null) => void;
}

// Refined "Matte" Gradient - Less Rainbow, more Heatmap style
// Blue (Down) -> Green (Flat) -> Red (Up)
const colorStops = [
    { val: -15, color: [59, 130, 246] },   // Blue 500 (Steep Down)
    { val: -5,  color: [96, 165, 250] },   // Blue 400 (Mild Down)
    { val: 0,   color: [16, 185, 129] },   // Emerald 500 (Flat)
    { val: 5,   color: [251, 146, 60] },   // Orange 400 (Mild Up)
    { val: 15,  color: [239, 68, 68] }     // Red 500 (Steep Up)
];

const interpolateColor = (slope: number): string => {
    const s = Math.max(-20, Math.min(20, slope));

    let lower = colorStops[0];
    let upper = colorStops[colorStops.length - 1];

    for (let i = 0; i < colorStops.length - 1; i++) {
        if (s >= colorStops[i].val && s <= colorStops[i+1].val) {
            lower = colorStops[i];
            upper = colorStops[i+1];
            break;
        }
    }

    if (lower.val === upper.val) return `rgb(${lower.color.join(',')})`;

    const t = (s - lower.val) / (upper.val - lower.val);

    const r = Math.round(lower.color[0] + (upper.color[0] - lower.color[0]) * t);
    const g = Math.round(lower.color[1] + (upper.color[1] - lower.color[1]) * t);
    const b = Math.round(lower.color[2] + (upper.color[2] - lower.color[2]) * t);

    return `rgb(${r}, ${g}, ${b})`;
};

const ElevationProfile: React.FC<ElevationProfileProps> = ({ 
    rawPoints, 
    smoothedPoints, 
    smoothingLevel, 
    setSmoothingLevel, 
    hoveredPoint, 
    onHoverPoint 
}) => {
  
  // Calculate fixed Y-axis domain based on RAW data so the chart frame doesn't jump
  const { minEle, maxEle } = useMemo(() => {
    if (rawPoints.length === 0) return { minEle: 0, maxEle: 100 };
    let min = Infinity;
    let max = -Infinity;
    rawPoints.forEach(p => {
      if (p.ele < min) min = p.ele;
      if (p.ele > max) max = p.ele;
    });
    return { minEle: Math.floor(min - 20), maxEle: Math.ceil(max + 20) };
  }, [rawPoints]);

  const gradientId = "slopeGradient";

  const getSmoothingLabel = () => {
    if (smoothingLevel === 0) return "Raw";
    if (smoothingLevel === 1) return "Low";
    if (smoothingLevel === 2) return "Med";
    if (smoothingLevel === 3) return "High";
    return "Max";
  };

  const cycleSmoothing = () => {
    setSmoothingLevel((smoothingLevel + 1) % 5);
  };

  return (
    <div className="w-full h-[400px] bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex flex-col transition-all">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold text-slate-500">Elevation Profile & Gradient</h3>
        
        <div className="flex items-center space-x-4">
             <button 
                onClick={cycleSmoothing}
                className={`flex items-center space-x-1 text-xs px-2 py-1 rounded transition-colors ${smoothingLevel > 0 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
             >
                <Activity size={12} />
                <span>Smooth: {getSmoothingLabel()}</span>
             </button>

            {/* Legend */}
            <div className="flex space-x-3 text-[9px] text-slate-400 hidden lg:flex items-center">
                <div className="flex items-center space-x-1 border-r border-slate-200 pr-3 mr-1">
                    <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-blue-500 mr-1"></span>Descend</span>
                    <span className="text-[9px] font-bold text-slate-300 ml-1">DOWN</span>
                </div>
                <div className="flex items-center space-x-1">
                    <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-emerald-500 mr-1"></span>Flat</span>
                </div>
                <div className="flex items-center space-x-1 border-l border-slate-200 pl-3 ml-1">
                     <span className="text-[9px] font-bold text-slate-300 mr-1">UP</span>
                    <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-orange-400 mr-1"></span>Climb</span>
                    <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-red-500 mr-1"></span>Steep</span>
                </div>
            </div>
        </div>
      </div>
      
      <div className="flex-grow min-h-0" onMouseLeave={() => onHoverPoint(null)}>
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart
            data={smoothedPoints}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            onMouseMove={(state) => {
                if (state.isTooltipActive && state.activePayload && state.activePayload.length > 0) {
                    const point = state.activePayload[0].payload as GPXPoint;
                    onHoverPoint(point);
                }
            }}
            >
            <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
                {smoothedPoints.map((entry, index) => {
                    const offset = (index / (smoothedPoints.length - 1)) * 100;
                    const color = interpolateColor(entry.slope || 0);
                    return <stop key={index} offset={`${offset}%`} stopColor={color} />;
                })}
                </linearGradient>
            </defs>
            
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis 
                dataKey="distFromStart" 
                unit="km" 
                tick={{fontSize: 12}} 
                tickFormatter={(val) => val.toFixed(1)}
                interval="preserveStartEnd"
                minTickGap={30}
            />
            <YAxis 
                domain={[minEle, maxEle]} 
                unit="m" 
                tick={{fontSize: 11}} 
                width={60}
            />
            <Tooltip 
                formatter={(value: number, name: string) => {
                    if (name === "ele") return [`${Math.round(value)} m`, 'Elevation'];
                    return [value, name];
                }}
                labelFormatter={(label: number) => `Km ${label.toFixed(2)}`}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                        const dataPoint = payload[0].payload as GPXPoint;
                        const slope = dataPoint.slope || 0;
                        let slopeText = "Flat";
                        let slopeColor = "text-emerald-500";
                        
                        if (slope >= 2) { slopeText = "Uphill"; slopeColor = "text-orange-500"; }
                        if (slope >= 15) { slopeText = "Steep Uphill"; slopeColor = "text-red-500"; }
                        
                        if (slope <= -2) { slopeText = "Downhill"; slopeColor = "text-blue-400"; }
                        if (slope <= -15) { slopeText = "Steep Descent"; slopeColor = "text-blue-600"; }

                        return (
                            <div className="bg-white p-3 border border-slate-100 shadow-lg rounded-lg text-xs">
                                <p className="font-bold text-slate-700 mb-1">Km {Number(label).toFixed(2)}</p>
                                <p className="text-blue-600 font-mono">Alt: {Math.round(dataPoint.ele)} m</p>
                                <p className={`font-semibold ${slopeColor}`}>
                                    {slope > 0 ? '+' : ''}{slope.toFixed(1)}% ({slopeText})
                                </p>
                            </div>
                        );
                    }
                    return null;
                }}
            />
            
            {hoveredPoint && (
                <ReferenceLine x={hoveredPoint.distFromStart} stroke="#ef4444" strokeDasharray="3 3" />
            )}
            {hoveredPoint && (
                 <ReferenceDot x={hoveredPoint.distFromStart} y={hoveredPoint.ele} r={4} fill="#ef4444" stroke="white" />
            )}

            <Area 
                type="monotone" 
                dataKey="ele" 
                stroke="url(#slopeGradient)" 
                fill="url(#slopeGradient)" 
                fillOpacity={0.6}
                strokeWidth={2}
                animationDuration={300}
            />
            </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ElevationProfile;
