
import React, { useState, useEffect, useMemo } from 'react';
import { Upload, Clock, Settings, AlertCircle, Calculator, CloudSun, Calendar, Thermometer, Wind, Droplets, Trophy, Gauge, Cloud, Sun, Sunrise, Sunset, Eye, Zap, Waves, Flame, Droplet, AlertTriangle, Umbrella, MapPin } from 'lucide-react';
import { parseGPX, smoothGPXPoints, calculateSlopeBreakdown } from './services/geoUtils';
import { 
  calculateNaismith, 
  calculateTobler, 
  calculateMunter, 
  calculateSwiss, 
  calculatePetzoldt, 
  calculateSmartAggregate, 
  formatDuration, 
  calculateDifficulty, 
  calculateBioMetrics, 
  calculateSafety 
} from './services/calcService';
import { fetchWeatherForecast } from './services/weatherService';
import { RouteStats, FitnessLevel, PaceType, PackWeight, CalculationContext, TimeEstimation, DifficultyRating, WeatherData, SmartAggregate, BioMetrics, SafetyMetrics, GPXPoint, SlopeBreakdown } from './types';
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
  const [smoothingLevel, setSmoothingLevel] = useState<number>(1); // Lifted state
  
  // Planning States
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState<string>("09:00");
  
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  const [estimations, setEstimations] = useState<TimeEstimation[]>([]);
  const [aggregate, setAggregate] = useState<SmartAggregate | null>(null);
  const [difficulty, setDifficulty] = useState<DifficultyRating | null>(null);
  const [bioMetrics, setBioMetrics] = useState<BioMetrics | null>(null);
  const [safety, setSafety] = useState<SafetyMetrics | null>(null);
  
  const [hoveredPoint, setHoveredPoint] = useState<GPXPoint | null>(null);
  
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
        setWeather(null); // Reset weather on new upload
        setHoveredPoint(null);
        setSmoothingLevel(1); // Reset smoothing default
      } catch (err) {
        setError("Error reading GPX file. Please ensure it is a valid format.");
        console.error(err);
      }
    };
    reader.readAsText(file);
  };

  // Calculate Smoothed Data and Dynamic Slope Stats
  const { smoothedPoints, currentSlopeBreakdown } = useMemo(() => {
    if (!stats) return { smoothedPoints: [], currentSlopeBreakdown: null };
    
    const smoothed = smoothGPXPoints(stats.points, smoothingLevel);
    const slopeStats = calculateSlopeBreakdown(smoothed, stats.totalDistance);
    
    return { smoothedPoints: smoothed, currentSlopeBreakdown: slopeStats };
  }, [stats, smoothingLevel]);

  // Fetch Weather when stats or date changes
  useEffect(() => {
    const getWeather = async () => {
      if (stats && stats.points.length > 0 && selectedDate) {
        setWeatherLoading(true);
        setWeatherError(null);
        try {
          const startPoint = stats.points[0];
          const data = await fetchWeatherForecast(startPoint.lat, startPoint.lon, selectedDate);
          setWeather(data);
        } catch (e) {
          setWeatherError("Could not fetch forecast. Is the date too far in the future?");
          setWeather(null);
        } finally {
          setWeatherLoading(false);
        }
      }
    };
    getWeather();
  }, [stats, selectedDate]);

  useEffect(() => {
    if (stats) {
      setDifficulty(calculateDifficulty(stats));

      const ctx: CalculationContext = { stats, fitness, pace, weight, includeBreaks };
      
      const results = [
        calculateNaismith(ctx),
        calculateTobler(ctx),
        calculateMunter(ctx),
        calculateSwiss(ctx),
        calculatePetzoldt(ctx),
      ];

      setEstimations(results);
      const agg = calculateSmartAggregate(results);
      setAggregate(agg);
      
      // Calculate Bio & Safety
      setBioMetrics(calculateBioMetrics(ctx, agg.val, weather?.maxTemp));
      setSafety(calculateSafety(startTime, agg.val, weather?.sunset));
    }
  }, [stats, fitness, pace, weight, includeBreaks, weather, startTime]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm print:hidden">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-orange-500 p-1.5 rounded-lg text-white">
               <Clock size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 leading-tight">TrekkingTime Pro</h1>
              <p className="text-[10px] text-slate-500 font-medium tracking-wide">GPX Route Analyzer</p>
            </div>
          </div>
          <div className="text-xs text-slate-400 hidden sm:block">
            Scientific Hiking Time Calculator
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-6xl mx-auto px-4 py-8 w-full">
        
        {/* Upload Section - Only show prominent if no data */}
        {!stats && (
          <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg border border-slate-100 p-12 text-center transition-all hover:shadow-xl mt-10">
            <div className="mx-auto w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mb-6">
              <Upload className="text-orange-500 w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">Upload your GPX file</h2>
            <p className="text-slate-500 mb-8 max-w-md mx-auto">
              Analyze your route, visualize gradient profiles, and calculate estimated times using 5 different professional algorithms.
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
          <div className="space-y-6 animate-fade-in print:space-y-4">
            
            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-2 gap-4 print:hidden">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold text-slate-800">Route Analysis</h2>
                {difficulty && (
                    <div className={`px-3 py-1 rounded-full border ${difficulty.color} flex items-center gap-2`}>
                        <Trophy size={14} className={difficulty.textColor} />
                        <span className={`text-xs font-bold uppercase ${difficulty.textColor}`}>{difficulty.label}</span>
                    </div>
                )}
              </div>
              <div className="flex gap-2">
                  <button onClick={() => window.print()} className="cursor-pointer text-sm text-slate-600 font-medium hover:text-slate-800 flex items-center space-x-1 bg-white border border-slate-200 px-3 py-1 rounded-full transition-colors">
                    <Settings size={14} />
                    <span>Print Report</span>
                  </button>
                  <label className="cursor-pointer text-sm text-orange-600 font-medium hover:text-orange-700 flex items-center space-x-1 bg-orange-50 px-3 py-1 rounded-full transition-colors">
                    <Upload size={14} />
                    <span>Load new GPX</span>
                    <input type="file" accept=".gpx" onChange={handleFileUpload} className="hidden" />
                  </label>
              </div>
            </div>

            <StatsCards stats={stats} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:grid-cols-2">
              
              {/* Controls & Results Column */}
              <div className="lg:col-span-1 space-y-6 order-2 lg:order-1 print:break-inside-avoid">
                
                {/* Configuration Panel */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 print:border-black">
                  <div className="flex items-center space-x-2 mb-4 text-slate-700">
                    <Settings className="w-5 h-5" />
                    <h3 className="font-semibold">Plan & Profile</h3>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                         <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Trip Date</label>
                            <input 
                                type="date" 
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Start Time</label>
                            <input 
                                type="time" 
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                            />
                        </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Fitness Level</label>
                      <select 
                        value={fitness}
                        onChange={(e) => setFitness(e.target.value as FitnessLevel)}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
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
                        className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
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
                        className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
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
                        className={`w-12 h-6 rounded-full transition-colors duration-200 ease-in-out relative ${includeBreaks ? 'bg-orange-500' : 'bg-slate-300'} print:hidden`}
                       >
                         <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow transition-transform duration-200 ${includeBreaks ? 'translate-x-6' : 'translate-x-0'}`} />
                       </button>
                    </div>
                  </div>
                </div>

                {/* Main Estimation Display */}
                {aggregate && (
                    <div className="bg-slate-800 text-white p-6 rounded-xl shadow-lg relative overflow-hidden print:bg-slate-100 print:text-black print:border print:border-black">
                        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-orange-500 rounded-full opacity-20 blur-2xl print:hidden"></div>
                        <div className="relative z-10 text-center mb-6">
                            <p className="text-xs text-slate-300 uppercase tracking-wider font-semibold mb-1 print:text-slate-600">Estimated Moving Time</p>
                            <div className="text-5xl font-bold text-white tracking-tight print:text-black">
                                {formatDuration(aggregate.val)}
                            </div>
                            
                            {safety && (
                                <div className="mt-2 text-sm font-medium">
                                    <span className="text-slate-300 print:text-slate-600">Finish around: </span>
                                    <span className="text-white font-bold print:text-black">{safety.finishTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                </div>
                            )}

                            {safety && safety.isNightHiking && (
                                <div className="mt-3 flex items-center justify-center gap-2 text-xs text-red-200 bg-red-900/40 p-2 rounded-lg border border-red-500/30 print:text-red-600 print:bg-red-50 print:border-red-200">
                                    <AlertTriangle size={14} />
                                    <span>Warning: Finish time is after sunset.</span>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2 relative z-10 border-t border-slate-700 pt-4 max-h-48 overflow-y-auto pr-2 custom-scrollbar print:border-slate-300">
                            {estimations.map((est, idx) => (
                                <div key={idx} className="flex justify-between items-center text-sm group">
                                    <span className="text-slate-400 group-hover:text-slate-200 transition-colors print:text-slate-600">{est.method}</span>
                                    <span className="font-mono text-slate-200 print:text-black">{formatDuration(est.timeMinutes)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                {/* Bio Metrics */}
                {bioMetrics && (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center">
                            <Flame size={24} className="text-orange-500 mb-2" />
                            <p className="text-xl font-bold text-slate-800">{bioMetrics.calories}</p>
                            <p className="text-xs text-slate-500 uppercase tracking-wide">Kcal Est.</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center">
                            <Droplet size={24} className="text-blue-500 mb-2" />
                            <p className="text-xl font-bold text-slate-800">{bioMetrics.water}L</p>
                            <p className="text-xs text-slate-500 uppercase tracking-wide">Water Need</p>
                        </div>
                    </div>
                )}

                {/* Terrain Breakdown (Dynamic) */}
                {currentSlopeBreakdown && (
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm print:break-inside-avoid">
                       <div className="flex justify-between items-center mb-4">
                           <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Terrain Slope Analysis</h3>
                           <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-full">Smoothed</span>
                       </div>
                       <div className="space-y-3">
                           {[
                               { label: 'Extreme Down', color: 'bg-blue-600', val: currentSlopeBreakdown.steepDown },
                               { label: 'Mod. Down', color: 'bg-blue-500', val: currentSlopeBreakdown.moderateDown },
                               { label: 'Mild Down', color: 'bg-blue-400', val: currentSlopeBreakdown.mildDown },
                               { label: 'Flat (<2%)', color: 'bg-emerald-400', val: currentSlopeBreakdown.flat },
                               { label: 'Mild Up', color: 'bg-orange-400', val: currentSlopeBreakdown.mildUp },
                               { label: 'Mod. Up', color: 'bg-orange-500', val: currentSlopeBreakdown.moderateUp },
                               { label: 'Extreme Up', color: 'bg-red-500', val: currentSlopeBreakdown.steepUp },
                           ].filter(i => i.val > 0).map((item, i) => { 
                               const pct = ((item.val / stats.totalDistance) * 100);
                               return (
                                   <div key={i}>
                                       <div className="flex justify-between text-xs mb-1">
                                           <span className="text-slate-600 font-medium">{item.label}</span>
                                           <span className="text-slate-400">{pct.toFixed(1)}% ({item.val.toFixed(1)} km)</span>
                                       </div>
                                       <div className="w-full bg-slate-100 rounded-full h-2">
                                           <div 
                                            className={`h-2 rounded-full ${item.color} print:print-color-adjust-exact`} 
                                            style={{ width: `${pct}%` }}
                                           ></div>
                                       </div>
                                   </div>
                               )
                           })}
                       </div>
                    </div>
                )}

              </div>

              {/* Visuals Column */}
              <div className="lg:col-span-2 space-y-6 order-1 lg:order-2 print:col-span-1">
                <div className="print:hidden">
                    <MapDisplay 
                        points={stats.points} 
                        hoveredPoint={hoveredPoint} 
                        onHoverPoint={setHoveredPoint} 
                    />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-1">
                    {/* Weather Widget */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-full">
                        <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                            <div className="flex items-center gap-2 text-slate-700 font-semibold">
                                <CloudSun size={20} className="text-blue-500" />
                                <span>Weather Forecast</span>
                            </div>
                        </div>

                        {weatherLoading && (
                            <div className="flex justify-center items-center h-40 text-sm text-slate-400 animate-pulse">
                                Fetching comprehensive forecast...
                            </div>
                        )}

                        {weatherError && !weatherLoading && (
                             <div className="flex justify-center items-center h-40 text-xs text-red-400 text-center px-4 bg-red-50 rounded-lg">
                                {weatherError}
                            </div>
                        )}

                        {weather && !weatherLoading && (
                            <div className="space-y-4">
                                {/* Top Row: Main Temp and Sky */}
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                                            <Thermometer size={28} />
                                        </div>
                                        <div>
                                            <div className="flex items-baseline gap-2">
                                                <p className="text-3xl font-bold text-slate-800">{weather.maxTemp}°</p>
                                                <span className="text-sm text-slate-400">/ {weather.minTemp}°</span>
                                            </div>
                                            <p className="text-xs text-slate-500 font-medium">Feels like {weather.feelsLikeMax}°</p>
                                        </div>
                                    </div>
                                     <div className="text-right flex flex-col items-end">
                                         <div className="text-sm font-bold text-slate-700 flex items-center gap-1">
                                            {weather.weatherDescription}
                                         </div>
                                         <div className="inline-block bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-[10px] font-bold mt-1 flex items-center gap-1">
                                            <Umbrella size={10} />
                                            {weather.precipitationProbability}% Prob.
                                         </div>
                                     </div>
                                </div>

                                {/* Detailed Grid */}
                                <div className="grid grid-cols-3 gap-y-4 gap-x-2 pt-2">
                                     {/* Wind */}
                                     <div className="text-center p-2 bg-slate-50 rounded-lg">
                                        <Wind size={16} className="text-slate-400 mx-auto mb-1" />
                                        <p className="text-xs font-bold text-slate-700">{weather.windSpeed}<span className="text-[10px] font-normal">kph</span></p>
                                        <p className="text-[10px] text-slate-400">Gusts: {weather.windGusts}</p>
                                     </div>
                                     {/* Precip */}
                                     <div className="text-center p-2 bg-slate-50 rounded-lg">
                                        <Droplets size={16} className="text-slate-400 mx-auto mb-1" />
                                        <p className="text-xs font-bold text-slate-700">{weather.precipitation}<span className="text-[10px] font-normal">mm</span></p>
                                        <p className="text-[10px] text-slate-400">Volume</p>
                                     </div>
                                     {/* UV */}
                                     <div className="text-center p-2 bg-slate-50 rounded-lg">
                                         <Sun size={16} className="text-slate-400 mx-auto mb-1" />
                                         <p className="text-xs font-bold text-slate-700">{weather.uvIndex.toFixed(1)}</p>
                                         <p className="text-[10px] text-slate-400">UV Index</p>
                                     </div>
                                     
                                     {/* Pressure */}
                                     <div className="text-center p-2 bg-slate-50 rounded-lg">
                                        <Gauge size={16} className="text-slate-400 mx-auto mb-1" />
                                        <p className="text-xs font-bold text-slate-700">{weather.pressure}<span className="text-[10px] font-normal">hPa</span></p>
                                        <p className="text-[10px] text-slate-400">Pressure</p>
                                     </div>
                                     {/* Cloud */}
                                     <div className="text-center p-2 bg-slate-50 rounded-lg">
                                        <Cloud size={16} className="text-slate-400 mx-auto mb-1" />
                                        <p className="text-xs font-bold text-slate-700">{weather.cloudCover}<span className="text-[10px] font-normal">%</span></p>
                                        <p className="text-[10px] text-slate-400">Cover</p>
                                     </div>
                                     {/* Sun */}
                                     <div className="text-center p-2 bg-slate-50 rounded-lg flex flex-col justify-center">
                                         <div className="flex justify-center items-center gap-1 text-[10px] text-slate-600 mb-1">
                                            <Sunrise size={10} className="text-orange-400" />
                                            {new Date(weather.sunrise).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false})}
                                         </div>
                                         <div className="flex justify-center items-center gap-1 text-[10px] text-slate-600">
                                            <Sunset size={10} className="text-indigo-400" />
                                            {new Date(weather.sunset).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false})}
                                         </div>
                                     </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Difficulty Details */}
                    {difficulty && (
                        <div className={`p-5 rounded-xl border ${difficulty.color} shadow-sm flex flex-col justify-between h-full bg-opacity-50`}>
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className={`font-bold ${difficulty.textColor} flex items-center gap-2`}>
                                        <Zap size={18} />
                                        Difficulty Score
                                    </h3>
                                    <div className="flex flex-col items-end">
                                        <span className={`text-sm font-mono px-3 py-1 bg-white rounded-lg shadow-sm ${difficulty.textColor} font-bold`}>
                                            {difficulty.score.toFixed(1)} pts
                                        </span>
                                    </div>
                                </div>
                                
                                <p className={`text-3xl font-extrabold ${difficulty.textColor} mb-2`}>{difficulty.label}</p>
                                <p className={`text-sm ${difficulty.textColor} opacity-90 leading-relaxed font-medium mb-3`}>
                                    {difficulty.description}
                                </p>

                                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/60 ${difficulty.textColor} text-xs font-bold`}>
                                    <MapPin size={12} />
                                    {difficulty.details}
                                </div>
                            </div>
                            
                            <div className="mt-4 pt-4 border-t border-black/5 flex flex-col gap-1">
                                <span className={`text-xs font-bold uppercase tracking-wide ${difficulty.textColor} opacity-80`}>Energy Equivalent</span>
                                <p className={`text-sm ${difficulty.textColor}`}>
                                    Feels like walking <span className="font-bold">{difficulty.equivalentFlatKm.toFixed(1)} km</span> on flat ground.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <ElevationProfile 
                    rawPoints={stats.points}
                    smoothedPoints={smoothedPoints}
                    smoothingLevel={smoothingLevel}
                    setSmoothingLevel={setSmoothingLevel}
                    hoveredPoint={hoveredPoint} 
                    onHoverPoint={setHoveredPoint} 
                />
                
              </div>
              
            </div>
          </div>
        )}
      </main>

       {/* Footer */}
       <footer className="bg-white border-t border-slate-200 mt-auto py-6 print:hidden">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-slate-400 text-xs mb-2">
            <strong>Disclaimer:</strong> This tool provides estimates for planning purposes only. Actual times depend on many unpredictable factors. 
            Always carry a physical map, compass, and appropriate gear.
          </p>
          <div className="flex justify-center items-center space-x-4 text-xs font-medium text-slate-500">
            <span>TrekkingTime Pro v1.5</span>
            <span>•</span>
            <span>Local Processing (Privacy Focused)</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
