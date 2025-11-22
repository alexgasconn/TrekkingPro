import { GPXPoint, RouteStats } from '../types';

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

export const parseGPX = (gpxContent: string): RouteStats => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(gpxContent, "text/xml");
  const trkpts = Array.from(xmlDoc.querySelectorAll("trkpt"));

  if (trkpts.length === 0) {
    throw new Error("No se encontraron puntos de ruta (trkpt) en el archivo GPX.");
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
    
    if (i > 0) {
      const prev = points[i - 1];
      distFromPrev = calculateDistance(prev.lat, prev.lon, lat, lon);
      totalDistance += distFromPrev;

      const eleDiff = ele - prev.ele;
      
      // Filter small noise in elevation data (threshold 1 meter)
      if (Math.abs(eleDiff) > 0.5) {
          if (eleDiff > 0) {
            elevationGain += eleDiff;
          } else {
            elevationLoss += Math.abs(eleDiff);
          }
      }

      // Calculate slope for this segment
      if (distFromPrev > 0.001) { // avoid division by zero
        const slope = (eleDiff / (distFromPrev * 1000)); // rise / run
        totalSlopeAccumulator += Math.abs(slope);
        slopeCount++;
      }
    }

    points.push({
      lat,
      lon,
      ele,
      distFromStart: parseFloat(totalDistance.toFixed(3)),
    });
  }

  return {
    totalDistance: parseFloat(totalDistance.toFixed(2)),
    elevationGain: Math.round(elevationGain),
    elevationLoss: Math.round(elevationLoss),
    maxElevation: Math.round(maxElevation),
    minElevation: Math.round(minElevation),
    avgSlope: slopeCount > 0 ? (totalSlopeAccumulator / slopeCount) * 100 : 0,
    points,
  };
};