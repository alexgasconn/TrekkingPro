import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { GPXPoint } from '../types';
import { calculateDistance } from '../services/geoUtils';

interface ElevationProfileProps {
  points: GPXPoint[];
}

const ElevationProfile: React.FC<ElevationProfileProps> = ({ points }) => {
  // Prepare data with slope calculation for the gradient
  // We downsample if too many points to keep the DOM light, 
  // but we need enough density to show the color changes.
  const targetPoints = 300;
  const step = Math.ceil(points.length / targetPoints);
  
  const data = points.filter((_, i) => i % step === 0).map((p, i, arr) => {
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

  const gradientId = "slopeGradient";

  return (
    <div className="w-full h-64 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-semibold text-slate-500">Elevation Profile & Slope Gradient</h3>
        <div className="flex space-x-2 text-[10px] text-slate-400">
            <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-emerald-400 mr-1"></span>Flat/Down</span>
            <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-blue-400 mr-1"></span>Mild</span>
            <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-yellow-400 mr-1"></span>Mod</span>
            <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-red-500 mr-1"></span>Steep</span>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
              {data.map((entry, index) => {
                const offset = (index / (data.length - 1)) * 100;
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
            // Custom tooltip content to show slope
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
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ElevationProfile;