import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { GPXPoint } from '../types';
import { calculateDistance } from '../services/geoUtils';
import { Activity } from 'lucide-react';

interface ElevationProfileProps {
  points: GPXPoint[];
}

const ElevationProfile: React.FC<ElevationProfileProps> = ({ points }) => {
  const [isSmoothed, setIsSmoothed] = useState(false);

  // Prepare data with slope calculation for the gradient
  const processedData = useMemo(() => {
    // Downsample for performance
    const targetPoints = 300;
    const step = Math.ceil(points.length / targetPoints);
    
    return points.filter((_, i) => i % step === 0).map((p, i, arr) => {
      let slope = 0;
      if (i > 0) {
        const prev = arr[i-1];
        const dist = calculateDistance(prev.lat, prev.lon, p.lat, p.lon);
        const eleDiff = p.ele - prev.ele;
        if (dist > 0) {
          slope = (eleDiff / (dist * 1000)) * 100; // Percentage
        }
      }
      return { ...p, calculatedSlope: slope };
    });
  }, [points]);

  // Smooth data using simple moving average
  const chartData = useMemo(() => {
    if (!isSmoothed) return processedData;

    const windowSize = 5; // Smoothing window
    return processedData.map((point, idx, arr) => {
        const start = Math.max(0, idx - Math.floor(windowSize / 2));
        const end = Math.min(arr.length, idx + Math.floor(windowSize / 2) + 1);
        const subset = arr.slice(start, end);
        const avgEle = subset.reduce((sum, p) => sum + p.ele, 0) / subset.length;
        const avgSlope = subset.reduce((sum, p) => sum + p.calculatedSlope, 0) / subset.length;
        
        return { ...point, ele: avgEle, calculatedSlope: avgSlope };
    });
  }, [processedData, isSmoothed]);

  const gradientId = "slopeGradient";

  return (
    <div className="w-full h-72 bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold text-slate-500">Elevation Profile & Gradient</h3>
        
        <div className="flex items-center space-x-4">
             <button 
                onClick={() => setIsSmoothed(!isSmoothed)}
                className={`flex items-center space-x-1 text-xs px-2 py-1 rounded transition-colors ${isSmoothed ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
             >
                <Activity size={12} />
                <span>{isSmoothed ? 'Smoothed' : 'Raw Data'}</span>
             </button>

            <div className="flex space-x-2 text-[10px] text-slate-400 hidden sm:flex">
                <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-emerald-400 mr-1"></span>Flat</span>
                <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-blue-400 mr-1"></span>Mild</span>
                <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-yellow-400 mr-1"></span>Mod</span>
                <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-red-500 mr-1"></span>Steep</span>
            </div>
        </div>
      </div>
      
      <div className="flex-grow min-h-0">
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
            <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
                {chartData.map((entry, index) => {
                    const offset = (index / (chartData.length - 1)) * 100;
                    let color = "#3b82f6"; // Default Blue (Mild)
                    
                    const s = entry.calculatedSlope;
                    if (s < 2) color = "#34d399"; // Emerald (Flat/Down)
                    else if (s >= 2 && s < 8) color = "#60a5fa"; // Blue (Gentle)
                    else if (s >= 8 && s < 15) color = "#facc15"; // Yellow (Moderate)
                    else if (s >= 15) color = "#ef4444"; // Red (Steep)

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
            />
            <YAxis 
                domain={['dataMin - 20', 'dataMax + 20']} 
                unit="m" 
                tick={{fontSize: 12}} 
                width={40}
            />
            <Tooltip 
                formatter={(value: number, name: string, props: any) => {
                    if (name === "ele") return [`${Math.round(value)} m`, 'Elevation'];
                    return [value, name];
                }}
                labelFormatter={(label: number) => `Km ${label.toFixed(2)}`}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                        const dataPoint = payload[0].payload;
                        return (
                            <div className="bg-white p-3 border border-slate-100 shadow-lg rounded-lg text-xs">
                                <p className="font-bold text-slate-700 mb-1">Km {Number(label).toFixed(2)}</p>
                                <p className="text-blue-600">Elevation: {Math.round(dataPoint.ele)} m</p>
                                <p className={`font-semibold ${dataPoint.calculatedSlope > 15 ? 'text-red-500' : 'text-slate-500'}`}>
                                    Grade: {dataPoint.calculatedSlope.toFixed(1)}%
                                </p>
                            </div>
                        );
                    }
                    return null;
                }}
            />
            <Area 
                type="monotone" 
                dataKey="ele" 
                stroke="url(#slopeGradient)" 
                fill="url(#slopeGradient)" 
                fillOpacity={0.4}
                strokeWidth={2}
                animationDuration={500}
            />
            </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ElevationProfile;