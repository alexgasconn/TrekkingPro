export interface GPXPoint {
  lat: number;
  lon: number;
  ele: number;
  distFromStart: number; // in km
  slope?: number; // percentage
}

export interface RouteStats {
  totalDistance: number; // km
  elevationGain: number; // meters
  elevationLoss: number; // meters
  maxElevation: number; // meters
  minElevation: number; // meters
  avgSlope: number; // percentage
  points: GPXPoint[];
}

export enum FitnessLevel {
  UNTRAINED = 'Untrained / Sedentary',
  AVERAGE = 'Average Hiker',
  ATHLETIC = 'Athletic / Fit',
  ELITE = 'Elite / Endurance',
  PRO = 'Pro Alpinist',
}

export enum PaceType {
  PHOTOGRAPHY = 'Leisure / Photography',
  RELAXED = 'Relaxed Walk',
  STEADY = 'Steady Hiking',
  FAST = 'Fast / Power Hiking',
  TRAIL_RUN = 'Trail Running',
}

export enum PackWeight {
  LIGHT = 'Light (<5kg)',
  MEDIUM = 'Medium (5-10kg)',
  HEAVY = 'Heavy (>10kg)',
}

export interface TimeEstimation {
  method: string;
  timeMinutes: number;
  description: string;
}

export interface CalculationContext {
  stats: RouteStats;
  fitness: FitnessLevel;
  pace: PaceType;
  weight: PackWeight;
  includeBreaks: boolean;
}