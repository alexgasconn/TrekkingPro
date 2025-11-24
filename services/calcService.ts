
import { CalculationContext, FitnessLevel, PaceType, PackWeight, TimeEstimation, DifficultyRating, SmartAggregate, BioMetrics, SafetyMetrics, RouteStats } from '../types';
import { calculateDistance } from './geoUtils';

// 1. Calculate Base Speed based on Fitness
const getFitnessBaseSpeed = (fitness: FitnessLevel): number => {
  switch (fitness) {
    case FitnessLevel.SEDENTARY: return 2.5;
    case FitnessLevel.BEGINNER: return 3.2;
    case FitnessLevel.AVERAGE: return 4.0; // Standard Naismith base
    case FitnessLevel.ATHLETIC: return 5.0;
    case FitnessLevel.ENDURANCE: return 5.5;
    case FitnessLevel.ELITE: return 6.0;
    case FitnessLevel.SUPER_HUMAN: return 7.0;
    default: return 4.0;
  }
};

// 2. Calculate Pace Multiplier
const getPaceMultiplier = (pace: PaceType): number => {
  switch (pace) {
    case PaceType.PHOTOGRAPHY: return 0.6; // Very slow, stopping often
    case PaceType.RELAXED: return 0.8;
    case PaceType.NORDIC: return 1.1; // Efficient walking
    case PaceType.STEADY: return 1.0; // Normal hiking pace
    case PaceType.POWER: return 1.3;
    case PaceType.FAST: return 1.4;
    case PaceType.TRAIL_RUN: return 2.0;
    case PaceType.SKY_RUN: return 2.4; // Very fast uphill
    default: return 1.0;
  }
};

const getCalculatedSpeed = (ctx: CalculationContext): number => {
  let speed = getFitnessBaseSpeed(ctx.fitness);
  speed *= getPaceMultiplier(ctx.pace);
  
  // Langmuir correction for weight
  if (ctx.weight === PackWeight.MEDIUM) speed *= 0.95;
  if (ctx.weight === PackWeight.HEAVY) speed *= 0.85; // Heavier impact
  
  return speed;
};

const applyBreaks = (minutes: number, ctx: CalculationContext): number => {
  const isRunning = ctx.pace === PaceType.TRAIL_RUN || ctx.pace === PaceType.SKY_RUN;
  if (!ctx.includeBreaks || isRunning) return minutes;
  
  // General rule: 10 mins break per hour of hiking
  const hours = minutes / 60;
  const breakMinutes = Math.floor(hours) * 10;
  return minutes + breakMinutes;
};

// --- METHODS ---

// 1. Naismith's Rule (Modified)
export const calculateNaismith = (ctx: CalculationContext): TimeEstimation => {
  const speed = getCalculatedSpeed(ctx);
  
  const timeDist = ctx.stats.totalDistance / speed; // hours
  const climbFactor = ctx.fitness === FitnessLevel.ELITE || ctx.fitness === FitnessLevel.SUPER_HUMAN ? 800 : 600;
  const timeVert = ctx.stats.elevationGain / climbFactor; 
  
  const totalMinutes = (timeDist + timeVert) * 60;

  return {
    method: "Naismith's Rule",
    timeMinutes: Math.round(applyBreaks(totalMinutes, ctx)),
    description: "Classic: 1hr/5km + 1hr/600m ascent."
  };
};

// 2. Tobler's Hiking Function
export const calculateTobler = (ctx: CalculationContext): TimeEstimation => {
  const points = ctx.stats.points;
  let totalHours = 0;

  const userSpeed = getCalculatedSpeed(ctx); 
  const scaleFactor = 6 / userSpeed; 

  for (let i = 1; i < points.length; i++) {
    const p1 = points[i-1];
    const p2 = points[i];
    const dist = calculateDistance(p1.lat, p1.lon, p2.lat, p2.lon); 
    if (dist === 0) continue;

    const eleDiff = (p2.ele - p1.ele);
    const slope = eleDiff / (dist * 1000); 

    // V = 6 * e^(-3.5 * |m + 0.05|)
    let velocity = 6 * Math.exp(-3.5 * Math.abs(slope + 0.05)); 
    
    // Safety clamp: If slope is extreme (GPS noise), velocity can drop near zero, causing infinite time.
    // We enforce a minimum crawling speed of 0.5 km/h to handle noisy data.
    if (velocity < 0.5) velocity = 0.5;

    totalHours += (dist / velocity);
  }

  totalHours = totalHours * scaleFactor;
  return {
    method: "Tobler's Function",
    timeMinutes: Math.round(applyBreaks(totalHours * 60, ctx)),
    description: "Scientific: Slope-dependent velocity integration."
  };
};

// 3. Munter Method
export const calculateMunter = (ctx: CalculationContext): TimeEstimation => {
    const speed = getCalculatedSpeed(ctx);
    const distUnits = ctx.stats.totalDistance;
    const vertUnits = ctx.stats.elevationGain / 100; 
    
    let totalHours = (distUnits + vertUnits) / speed;

    if (ctx.weight === PackWeight.HEAVY) {
        totalHours += (ctx.stats.elevationLoss / 1000); 
    }
    
    return {
        method: "Munter Method",
        timeMinutes: Math.round(applyBreaks(totalHours * 60, ctx)),
        description: "Alpinism: Distance + Effort units calculation."
    };
}

// 4. Swiss Hiking Federation (DIN 33466)
export const calculateSwiss = (ctx: CalculationContext): TimeEstimation => {
  const speedFactor = getCalculatedSpeed(ctx) / 4.0; // 1.0 for average

  const t_horiz_hours = ctx.stats.totalDistance / (4.0 * speedFactor);
  
  const t_up_hours = ctx.stats.elevationGain / (400 * speedFactor);
  const t_down_hours = ctx.stats.elevationLoss / (800 * speedFactor);
  const t_vert_hours = t_up_hours + t_down_hours;

  const maxVal = Math.max(t_horiz_hours, t_vert_hours);
  const minVal = Math.min(t_horiz_hours, t_vert_hours);

  const totalHours = maxVal + (minVal * 0.5);

  return {
    method: "Swiss (DIN 33466)",
    timeMinutes: Math.round(applyBreaks(totalHours * 60, ctx)),
    description: "Standard Alps method: Max(H, V) + ½ Min(H, V)."
  }
}

// 5. Petzoldt's Energy Mile
export const calculatePetzoldt = (ctx: CalculationContext): TimeEstimation => {
  const speed = getCalculatedSpeed(ctx); // km/h

  const energyKmFromDist = ctx.stats.totalDistance;
  const energyKmFromGain = ctx.stats.elevationGain / 152.4;

  const totalEnergyKm = energyKmFromDist + energyKmFromGain;
  
  const totalHours = totalEnergyKm / speed;

  return {
    method: "Petzoldt Energy",
    timeMinutes: Math.round(applyBreaks(totalHours * 60, ctx)),
    description: "Energy Mile theory: Converts gain to equivalent distance."
  }
}

// --- AGGREGATOR ---

export const calculateSmartAggregate = (estimations: TimeEstimation[]): SmartAggregate => {
  if (estimations.length === 0) return { val: 0, type: 'MEAN', reason: 'No data' };

  const values = estimations.map(e => e.timeMinutes).sort((a, b) => a - b);
  
  // 1. Calculate Mean
  const sum = values.reduce((acc, curr) => acc + curr, 0);
  const mean = sum / values.length;

  // 2. Calculate Median
  const mid = Math.floor(values.length / 2);
  const median = values.length % 2 !== 0 ? values[mid] : (values[mid - 1] + values[mid]) / 2;

  // 3. Check Deviation
  const diffPercent = Math.abs(mean - median) / median;
  
  if (diffPercent > 0.10) {
    return {
      val: Math.round(median),
      type: 'MEDIAN',
      reason: `Average skewed by outliers (${(diffPercent * 100).toFixed(0)}% var). Using Median.`
    };
  }

  return {
    val: Math.round(mean),
    type: 'MEAN',
    reason: 'Methods align well. Using Average.'
  };
}

export const formatDuration = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return `${h}h ${m}m`;
};

// --- DIFFICULTY CALCULATOR ---

const analyzeRoute = (stats: RouteStats): string => {
  const characteristics: string[] = [];

  // 1. Check for High Altitude
  if (stats.maxElevation > 2500) characteristics.push("High Altitude");
  else if (stats.maxElevation > 1500) characteristics.push("Alpine");

  // 2. Check for Steep Start (First 15% of dist has > 20% of gain)
  const startDistIdx = Math.floor(stats.points.length * 0.15);
  if (startDistIdx > 0 && stats.points.length > startDistIdx) {
    const startGain = stats.points[startDistIdx].ele - stats.points[0].ele;
    if (startGain > stats.elevationGain * 0.25) {
      characteristics.push("Steep Start");
    }
  }

  // 3. Check for Uphill Finish
  const endDistIdx = Math.floor(stats.points.length * 0.85);
  if (endDistIdx < stats.points.length) {
    const endGain = stats.points[stats.points.length - 1].ele - stats.points[endDistIdx].ele;
    if (endGain > 150) {
      characteristics.push("Uphill Finish");
    }
  }

  // 4. Slope characteristics
  const steepPercent = (stats.slopeBreakdown.steepUp + stats.slopeBreakdown.steepDown) / stats.totalDistance;
  if (steepPercent > 0.3) characteristics.push("Technical/Steep");
  
  const flatPercent = stats.slopeBreakdown.flat / stats.totalDistance;
  if (flatPercent > 0.6) characteristics.push("Mostly Flat");

  if (characteristics.length === 0) return "Varied Terrain";
  return characteristics.slice(0, 2).join(" & ");
}

export const calculateDifficulty = (stats: RouteStats): DifficultyRating => {
  const dist = stats.totalDistance;
  const gain = stats.elevationGain;
  
  const effortPoints = dist + (gain / 100);
  const equivalentFlatKm = dist + (gain / 100);
  const details = analyzeRoute(stats);

  // Expanded thresholds to be less pessimistic
  if (effortPoints < 5) {
    return { score: effortPoints, equivalentFlatKm, details, label: 'Very Easy', color: 'bg-emerald-100 border-emerald-200', textColor: 'text-emerald-700', description: 'Brief walk, suitable for all.' };
  } else if (effortPoints < 8) {
    return { score: effortPoints, equivalentFlatKm, details, label: 'Easy', color: 'bg-green-100 border-green-200', textColor: 'text-green-700', description: 'Pleasant hike, manageable hills.' };
  } else if (effortPoints < 12) {
    return { score: effortPoints, equivalentFlatKm, details, label: 'Moderate', color: 'bg-blue-100 border-blue-200', textColor: 'text-blue-700', description: 'Standard half-day hike.' };
  } else if (effortPoints < 18) {
    return { score: effortPoints, equivalentFlatKm, details, label: 'Challenging', color: 'bg-indigo-100 border-indigo-200', textColor: 'text-indigo-700', description: 'Good fitness required, long day.' };
  } else if (effortPoints < 25) {
    return { score: effortPoints, equivalentFlatKm, details, label: 'Hard', color: 'bg-orange-100 border-orange-200', textColor: 'text-orange-700', description: 'Strenuous, steep sections.' };
  } else if (effortPoints < 35) {
    return { score: effortPoints, equivalentFlatKm, details, label: 'Demanding', color: 'bg-amber-100 border-amber-200', textColor: 'text-amber-700', description: 'Very tough, physical endurance test.' };
  } else if (effortPoints < 45) {
    return { score: effortPoints, equivalentFlatKm, details, label: 'Strenuous', color: 'bg-rose-100 border-rose-200', textColor: 'text-rose-700', description: 'Near-limit for day hiking.' };
  } else {
    return { score: effortPoints, equivalentFlatKm, details, label: 'Extreme', color: 'bg-slate-800 border-slate-600', textColor: 'text-slate-100', description: 'Expedition level or ultra-distance.' };
  }
};

// --- BIO METRICS (Calories & Water) ---
export const calculateBioMetrics = (ctx: CalculationContext, durationMinutes: number, tempC?: number): BioMetrics => {
    // 1. Calories (Simplified Pandolf / ACSM estimation)
    // Assume average hiker weight 75kg
    const bodyWeight = 75; 
    let loadWeight = 0;
    if (ctx.weight === PackWeight.MEDIUM) loadWeight = 7;
    if (ctx.weight === PackWeight.HEAVY) loadWeight = 15;
    
    const totalWeight = bodyWeight + loadWeight;
    const hours = durationMinutes / 60;
    
    // Base METs
    let mets = 3.5; 
    if (ctx.pace === PaceType.FAST) mets = 5.0;
    if (ctx.pace === PaceType.TRAIL_RUN) mets = 8.0;

    // Add METs for slope
    const avgGrade = (ctx.stats.elevationGain / (ctx.stats.totalDistance * 1000)) * 100;
    mets += (avgGrade * 0.3);

    const calories = Math.round(mets * totalWeight * hours);

    // 2. Water
    let waterRate = 0.5;
    if (tempC) {
        if (tempC > 20) waterRate += 0.2;
        if (tempC > 28) waterRate += 0.3;
        if (tempC > 35) waterRate += 0.2;
    }
    
    if (ctx.pace === PaceType.FAST || ctx.pace === PaceType.TRAIL_RUN) waterRate += 0.2;
    if (avgGrade > 8) waterRate += 0.1;

    return {
        calories,
        water: parseFloat((waterRate * hours).toFixed(1))
    };
};

// --- SAFETY (Daylight) ---
export const calculateSafety = (startTime: string, durationMinutes: number, sunsetStr?: string): SafetyMetrics => {
    const [hours, mins] = startTime.split(':').map(Number);
    const start = new Date();
    start.setHours(hours, mins, 0, 0);

    const finish = new Date(start.getTime() + durationMinutes * 60000);
    
    let isNightHiking = false;
    let sunsetTime = null;

    if (sunsetStr) {
        sunsetTime = new Date(sunsetStr);
        const userDate = start.getDate();
        sunsetTime.setDate(userDate);
        
        if (finish > sunsetTime) {
            isNightHiking = true;
        }
    }

    return {
        finishTime: finish,
        sunsetTime,
        isNightHiking
    };
};
