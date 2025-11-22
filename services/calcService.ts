import { CalculationContext, FitnessLevel, PaceType, PackWeight, TimeEstimation } from '../types';
import { calculateDistance } from './geoUtils';

// 1. Calculate Base Speed based on Fitness
const getFitnessBaseSpeed = (fitness: FitnessLevel): number => {
  switch (fitness) {
    case FitnessLevel.UNTRAINED: return 3.0;
    case FitnessLevel.AVERAGE: return 4.0; // Standard Naismith base
    case FitnessLevel.ATHLETIC: return 5.0;
    case FitnessLevel.ELITE: return 6.0;
    case FitnessLevel.PRO: return 7.0;
    default: return 4.0;
  }
};

// 2. Calculate Pace Multiplier
const getPaceMultiplier = (pace: PaceType): number => {
  switch (pace) {
    case PaceType.PHOTOGRAPHY: return 0.6; // Very slow, stopping often
    case PaceType.RELAXED: return 0.8;
    case PaceType.STEADY: return 1.0; // Normal hiking pace
    case PaceType.FAST: return 1.2;
    case PaceType.TRAIL_RUN: return 1.8; // Significantly faster
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

// 1. Naismith's Rule (Standard)
// 1 hour per 5km + 1 hour per 600m ascent
// Modified to use variable base speed: 1 hour per (BaseSpeed)km
export const calculateNaismith = (ctx: CalculationContext): TimeEstimation => {
  const speed = getCalculatedSpeed(ctx);
  
  const timeDist = ctx.stats.totalDistance / speed; // hours
  // Standard Naismith: 1hr per 600m (10 mins per 100m)
  // We adjust this slightly based on fitness too, stronger hikers climb faster
  const climbFactor = ctx.fitness === FitnessLevel.PRO || ctx.fitness === FitnessLevel.ELITE ? 800 : 600;
  
  const timeVert = ctx.stats.elevationGain / climbFactor; 
  
  let totalHours = timeDist + timeVert;

  if (ctx.includeBreaks && ctx.pace !== PaceType.TRAIL_RUN) {
    // Langmuir style: 10 mins per hour
    const breakTime = Math.floor(totalHours) * (10/60); 
    totalHours += breakTime;
  }

  return {
    method: "Naismith's Rule (Modified)",
    timeMinutes: Math.round(totalHours * 60),
    description: "Classic calculation: distance + elevation gain. Adjusted for your fitness base speed."
  };
};

// 2. Tobler's Hiking Function
// V = 6 * e^(-3.5 * |dh/dx + 0.05|)
export const calculateTobler = (ctx: CalculationContext): TimeEstimation => {
  const points = ctx.stats.points;
  let totalHours = 0;

  // Tobler Base Coeff is roughly 6km/h max for a fit walker on flat/slight downhill.
  // We scale the result based on user configuration.
  const userSpeed = getCalculatedSpeed(ctx); 
  // If calculated speed is 4km/h, and Tobler max is 6, we scale the final time up.
  const scaleFactor = 6 / userSpeed; 

  for (let i = 1; i < points.length; i++) {
    const p1 = points[i-1];
    const p2 = points[i];
    
    const dist = calculateDistance(p1.lat, p1.lon, p2.lat, p2.lon); // km
    if (dist === 0) continue;

    const eleDiff = (p2.ele - p1.ele); // meters
    const slope = eleDiff / (dist * 1000); // dh/dx

    // Tobler formula
    const velocity = 6 * Math.exp(-3.5 * Math.abs(slope + 0.05)); // km/h
    
    // Time = Distance / Velocity
    totalHours += (dist / velocity);
  }

  // Apply user fitness scaling
  totalHours = totalHours * scaleFactor;

  if (ctx.includeBreaks && ctx.pace !== PaceType.TRAIL_RUN) {
    totalHours += (totalHours * 0.15); // Add 15% for breaks
  }

  return {
    method: "Tobler's Function (Integral)",
    timeMinutes: Math.round(totalHours * 60),
    description: "Scientific: Analyzes the slope of every segment. Very accurate for variable terrain."
  };
};

// 3. Munter Method (Alpinism focused)
// Time = (Dist + (Elev/100))/V
export const calculateMunter = (ctx: CalculationContext): TimeEstimation => {
    const speed = getCalculatedSpeed(ctx);
    
    // Munter Equivalent Distance units
    const distUnits = ctx.stats.totalDistance;
    const vertUnits = ctx.stats.elevationGain / 100; // 100m gain = 1km flat equivalent
    
    // T = (Dist + Vert/100) / Rate
    let totalHours = (distUnits + vertUnits) / speed;

    // Descent Adjustment
    // Munter typically assumes decent is faster, but technical descent adds time.
    // We add a factor for descent if it's steep, but effectively Munter bundles effort.
    // Let's add a small penalty for heavy descent on knees if pack is heavy.
    if (ctx.weight === PackWeight.HEAVY) {
        totalHours += (ctx.stats.elevationLoss / 1000); // Extra hour per 1000m down if heavy
    }
    
    if (ctx.includeBreaks && ctx.pace !== PaceType.TRAIL_RUN) {
       totalHours += Math.floor(totalHours / 3) * 0.2; // 20 mins every 3 hours roughly
    }

    return {
        method: "Munter Method",
        timeMinutes: Math.round(totalHours * 60),
        description: "Alpinism: Converts elevation into 'flat km equivalents'. Ideal for steep mountain routes."
    };
}

export const formatDuration = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return `${h}h ${m}m`;
};