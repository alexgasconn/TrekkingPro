
import { GPXPoint, RouteStats, SlopeBreakdown } from '../types';

// Haversine formula to calculate distance between two lat/lon points in km
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const deg2rad = (deg: number): number => {
  return deg * (Math.PI / 180);
};

// Helper to calculate slope stats from a set of points
export const calculateSlopeBreakdown = (points: GPXPoint[], totalDistance: number): SlopeBreakdown => {
    const slopeDist = {
        steepDown: 0,
        moderateDown: 0,
        mildDown: 0,
        flat: 0,
        mildUp: 0,
        moderateUp: 0,
        steepUp: 0
    };

    for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const dist = curr.distFromStart - prev.distFromStart;
        
        if (dist > 0) {
            // Use the pre-calculated slope if available, otherwise calc on fly
            let slopeVal = curr.slope;
            if (slopeVal === undefined) {
                 const eleDiff = curr.ele - prev.ele;
                 slopeVal = (eleDiff / (dist * 1000)) * 100;
            }

            if (Math.abs(slopeVal) < 2) {
                slopeDist.flat += dist;
            } else if (slopeVal >= 2) {
                if (slopeVal < 8) slopeDist.mildUp += dist;
                else if (slopeVal < 15) slopeDist.moderateUp += dist;
                else slopeDist.steepUp += dist;
            } else {
                if (slopeVal > -8) slopeDist.mildDown += dist;
                else if (slopeVal > -15) slopeDist.moderateDown += dist;
                else slopeDist.steepDown += dist;
            }
        }
    }

    return {
        flat: parseFloat(slopeDist.flat.toFixed(2)),
        mildUp: parseFloat(slopeDist.mildUp.toFixed(2)),
        moderateUp: parseFloat(slopeDist.moderateUp.toFixed(2)),
        steepUp: parseFloat(slopeDist.steepUp.toFixed(2)),
        mildDown: parseFloat(slopeDist.mildDown.toFixed(2)),
        moderateDown: parseFloat(slopeDist.moderateDown.toFixed(2)),
        steepDown: parseFloat(slopeDist.steepDown.toFixed(2)),
    };
};

// Smoothing Logic
export const smoothGPXPoints = (points: GPXPoint[], level: number): GPXPoint[] => {
    // Downsample first to improve performance and remove micro-noise
    // Target roughly 800-1000 points for the chart
    const targetPoints = 1000;
    const step = Math.max(1, Math.ceil(points.length / targetPoints));
    
    const downsampled = points.filter((_, i) => i % step === 0).map((p, i, arr) => {
         let slope = 0;
         if (i > 0) {
            const prev = arr[i-1];
            const dist = calculateDistance(prev.lat, prev.lon, p.lat, p.lon);
            const eleDiff = p.ele - prev.ele;
            if (dist > 0.001) {
                slope = (eleDiff / (dist * 1000)) * 100;
            }
         }
         return { ...p, slope };
    });

    if (level === 0) return downsampled;

    let windowSize = 3;
    if (level === 1) windowSize = 5;   // Low
    if (level === 2) windowSize = 15;  // Med
    if (level === 3) windowSize = 40;  // High
    if (level === 4) windowSize = 80;  // Max

    return downsampled.map((point, idx, arr) => {
        const start = Math.max(0, idx - Math.floor(windowSize / 2));
        const end = Math.min(arr.length, idx + Math.floor(windowSize / 2) + 1);
        const subset = arr.slice(start, end);
        
        const avgEle = subset.reduce((sum, p) => sum + p.ele, 0) / subset.length;
        const avgSlope = subset.reduce((sum, p) => sum + (p.slope || 0), 0) / subset.length;
        
        return { ...point, ele: avgEle, slope: avgSlope };
    });
};

export const parseGPX = (gpxContent: string): RouteStats => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(gpxContent, "text/xml");
  const trkpts = Array.from(xmlDoc.querySelectorAll("trkpt"));

  if (trkpts.length === 0) {
    throw new Error("No track points (trkpt) found in the GPX file.");
  }

  let totalDistance = 0;
  let elevationGain = 0;
  let elevationLoss = 0;
  let maxElevation = -Infinity;
  let minElevation = Infinity;
  let totalSlopeAccumulator = 0;
  let slopeCount = 0;

  const points: GPXPoint[] = [];

  for (let i = 0; i < trkpts.length; i++) {
    const pt = trkpts[i];
    const lat = parseFloat(pt.getAttribute("lat") || "0");
    const lon = parseFloat(pt.getAttribute("lon") || "0");
    const ele = parseFloat(pt.querySelector("ele")?.textContent || "0");

    if (ele > maxElevation) maxElevation = ele;
    if (ele < minElevation) minElevation = ele;

    let distFromPrev = 0;
    let slopeVal = 0;

    if (i > 0) {
      const prev = points[i - 1];
      distFromPrev = calculateDistance(prev.lat, prev.lon, lat, lon);
      totalDistance += distFromPrev;

      const eleDiff = ele - prev.ele;
      
      if (Math.abs(eleDiff) > 0.5) {
          if (eleDiff > 0) {
            elevationGain += eleDiff;
          } else {
            elevationLoss += Math.abs(eleDiff);
          }
      }

      if (distFromPrev > 0.001) {
        slopeVal = (eleDiff / (distFromPrev * 1000)) * 100;
        totalSlopeAccumulator += Math.abs(slopeVal);
        slopeCount++;
      }
    }

    points.push({
      lat,
      lon,
      ele,
      distFromStart: parseFloat(totalDistance.toFixed(3)),
      slope: slopeVal
    });
  }

  // Calculate initial raw stats
  const slopeBreakdown = calculateSlopeBreakdown(points, totalDistance);

  return {
    totalDistance: parseFloat(totalDistance.toFixed(2)),
    elevationGain: Math.round(elevationGain),
    elevationLoss: Math.round(elevationLoss),
    maxElevation: Math.round(maxElevation),
    minElevation: Math.round(minElevation),
    avgSlope: slopeCount > 0 ? (totalSlopeAccumulator / slopeCount) : 0,
    points,
    slopeBreakdown
  };
};
