import React, { useState, useEffect } from 'react';
import { Upload, Clock, Settings, AlertCircle, Info, Map as MapIcon, Footprints } from 'lucide-react';
import { parseGPX } from './services/geoUtils';
import { calculateNaismith, calculateTobler, calculateMunter, formatDuration } from './services/calcService';
import { RouteStats, FitnessLevel, PaceType, PackWeight, CalculationContext, TimeEstimation } from './types';
import StatsCards from './components/StatsCards';
import MapDisplay from './components/MapDisplay';
import ElevationProfile from './components/ElevationProfile';

const App: React.FC = () => {
  const [stats, setStats] = useState<RouteStats | null>(null);
  
  // Default States
  const [fitness, setFitness] = useState<FitnessLevel>(FitnessLevel.AVERAGE);
  const [pace, setPace] = useState<PaceType>(PaceType.STEADY);
  const [weight, setWeight] = useState<PackWeight>(PackWeight.LIGHT);
  const [includeBreaks, setIncludeBreaks] = useState<boolean>(true);
  
  const [estimations, setEstimations] = useState<TimeEstimation[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsedStats = parseGPX(text);
        setStats(parsedStats);
        setError(null);
      } catch (err) {
        setError("Error reading GPX file. Please ensure it is a valid format.");
        console.error(err);
      }
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    if (stats) {
      const ctx: CalculationContext = { stats, fitness, pace, weight, includeBreaks };
      const naismith = calculateNaismith(ctx);
      const tobler = calculateTobler(ctx);
      const munter = calculateMunter(ctx);
      setEstimations([tobler, naismith, munter]);
    }
  }, [stats, fitness, pace, weight, includeBreaks]);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-orange-500 p-2 rounded-lg text-white">
               <Clock size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 leading-tight">TrekkingTime Pro</h1>
              <p className="text-xs text-slate-500 font-medium">GPX Route Analyzer</p>
            </div>
          </div>
          <div className="text-sm text-slate-400 hidden sm:block">
            Powered by Naismith, Tobler & Munter
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        
        {/* Upload Section - Only show prominent if no data */}
        {!stats && (
          <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg border border-slate-100 p-12 text-center transition-all hover:shadow-xl">
            <div className="mx-auto w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mb-6">
              <Upload className="text-orange-500 w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">Upload your GPX file</h2>
            <p className="text-slate-500 mb-8 max-w-md mx-auto">
              Analyze your route, visualize gradient profiles, and calculate estimated times with professional hiking algorithms.
            </p>
            
            <label className="inline-block cursor-pointer bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-8 rounded-full transition-colors shadow-md hover:shadow-lg transform active:scale-95">
              <span>Select GPX File</span>
              <input type="file" accept=".gpx" onChange={handleFileUpload} className="hidden" />
            </label>
            
            {error && (
              <div className="mt-6 p-4 bg-red-50 text-red-600 rounded-lg flex items-center justify-center space-x-2 text-sm">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}
          </div>
        )}

        {/* Dashboard */}
        {stats && (
          <div className="space-y-6 animate-fade-in">
            
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-slate-800">Route Analysis</h2>
              <label className="cursor-pointer text-sm text-orange-600 font-medium hover:text-orange-700 flex items-center space-x-1">
                <Upload size={14} />
                <span>Load new GPX</span>
                <input type="file" accept=".gpx" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>

            <StatsCards stats={stats} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Controls & Results Column */}
              <div className="lg:col-span-1 space-y-6">
                
                {/* Configuration Panel */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                  <div className="flex items-center space-x-2 mb-4 text-slate-700">
                    <Settings className="w-5 h-5" />
                    <h3 className="font-semibold">Hiker Profile & Settings</h3>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Fitness Level</label>
                      <select 
                        value={fitness}
                        onChange={(e) => setFitness(e.target.value as FitnessLevel)}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      >
                        {Object.values(FitnessLevel).map((l) => (
                          <option key={l} value={l}>{l}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Pace / Style</label>
                      <select 
                        value={pace}
                        onChange={(e) => setPace(e.target.value as PaceType)}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      >
                        {Object.values(PaceType).map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Pack Weight</label>
                      <select 
                        value={weight}
                        onChange={(e) => setWeight(e.target.value as PackWeight)}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      >
                        {Object.values(PackWeight).map((w) => (
                          <option key={w} value={w}>{w}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                       <label className="text-sm text-slate-600 font-medium">Include Rest Breaks</label>
                       <button 
                        onClick={() => setIncludeBreaks(!includeBreaks)}
                        className={`w-12 h-6 rounded-full transition-colors duration-200 ease-in-out relative ${includeBreaks ? 'bg-orange-500' : 'bg-slate-300'}`}
                       >
                         <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow transition-transform duration-200 ${includeBreaks ? 'translate-x-6' : 'translate-x-0'}`} />
                       </button>
                    </div>
                  </div>
                </div>

                {/* Estimations List */}
                <div className="bg-slate-800 text-white p-6 rounded-xl shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-orange-500 rounded-full opacity-20 blur-xl"></div>
                  
                  <h3 className="text-lg font-bold mb-4 relative z-10">Estimated Time</h3>
                  
                  <div className="space-y-4 relative z-10">
                    {estimations.map((est, idx) => (
                      <div key={idx} className="bg-slate-700/50 p-3 rounded-lg border border-slate-600">
                        <div className="flex justify-between items-baseline mb-1">
                          <span className="text-sm font-medium text-slate-300">{est.method}</span>
                          <span className="text-xl font-bold text-orange-400">{formatDuration(est.timeMinutes)}</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">{est.description}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-700/50">
                    <div className="flex items-start space-x-2">
                        <Info className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-slate-400">
                          The <b>Average Range</b> is approx <span className="text-white font-bold">{formatDuration(
                            Math.round(estimations.reduce((acc, curr) => acc + curr.timeMinutes, 0) / estimations.length)
                          )}</span>. Always plan with a safety margin.
                        </p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Visuals Column */}
              <div className="lg:col-span-2 space-y-6">
                <MapDisplay points={stats.points} />
                <ElevationProfile points={stats.points} />
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                     <h4 className="text-sm font-bold text-slate-700 mb-1">Average Slope</h4>
                     <p className="text-2xl font-light text-slate-600">{stats.avgSlope.toFixed(1)}%</p>
                  </div>
                   <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                     <h4 className="text-sm font-bold text-slate-700 mb-1">Data Points</h4>
                     <p className="text-2xl font-light text-slate-600">{stats.points.length}</p>
                  </div>
                </div>
              </div>
              
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;