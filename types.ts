
export interface GPXPoint {
  lat: number;
  lon: number;
  ele: number;
  distFromStart: number; // in km
  slope?: number; // percentage
}

export interface SlopeBreakdown {
  flat: number; // km < 2%
  mild: number; // km 2-8%
  moderate: number; // km 8-15%
  steep: number; // km 15-25%
  extreme: number; // km > 25%
}

export interface RouteStats {
  totalDistance: number; // km
  elevationGain: number; // meters
  elevationLoss: number; // meters
  maxElevation: number; // meters
  minElevation: number; // meters
  avgSlope: number; // percentage
  points: GPXPoint[];
  slopeBreakdown: SlopeBreakdown;
}

export enum FitnessLevel {
  SEDENTARY = 'Sedentary / Recovering',
  BEGINNER = 'Beginner Hiker',
  AVERAGE = 'Average Hiker',
  ATHLETIC = 'Athletic / Fit',
  ENDURANCE = 'Endurance / Marathoner',
  ELITE = 'Elite / Pro Alpinist',
  SUPER_HUMAN = 'World Class / Sherpa'
}

export enum PaceType {
  PHOTOGRAPHY = 'Leisure / Photography',
  RELAXED = 'Relaxed Walk',
  NORDIC = 'Nordic Walking',
  STEADY = 'Steady Hiking',
  POWER = 'Power Hiking',
  FAST = 'Fast / Speed Hiking',
  TRAIL_RUN = 'Trail Running',
  SKY_RUN = 'Sky Running / Vertical'
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

export interface DifficultyRating {
  score: number;
  label: string;
  color: string;
  textColor: string;
  description: string;
}

export interface WeatherData {
  date: string;
  maxTemp: number;
  minTemp: number;
  feelsLikeMax: number; 
  precipitation: number; // mm
  precipitationProbability: number; // %
  weatherDescription: string; // Text summary
  windSpeed: number; // km/h
  windGusts: number; // km/h
  weatherCode: number;
  pressure: number; // hPa
  cloudCover: number; // %
  humidity: number; // %
  uvIndex: number;
  sunrise: string;
  sunset: string;
}

export interface SmartAggregate {
  val: number;
  type: 'MEAN' | 'MEDIAN';
  reason: string;
}

export interface BioMetrics {
  calories: number; // kcal
  water: number; // liters
}

export interface SafetyMetrics {
  finishTime: Date;
  sunsetTime: Date | null;
  isNightHiking: boolean;
  hoursOfDaylightRemaining?: number;
}
