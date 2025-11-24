
import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Polyline, useMap, Marker, Popup, LayersControl, CircleMarker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { GPXPoint } from '../types';

// Fix for default Leaflet markers in React
const iconPerson = new L.Icon({
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Component to handle Map -> Chart sync (Mouse Move)
const MapEvents = ({ points, onHover }: { points: GPXPoint[], onHover: (p: GPXPoint | null) => void }) => {
    // Throttle the search to avoid lag on large routes
    const [lastMove, setLastMove] = useState(0);

    useMapEvents({
        mousemove(e) {
            const now = Date.now();
            if (now - lastMove < 50) return; // 50ms throttle
            setLastMove(now);

            // Find closest point (Simple implementation)
            // Optimization: For huge arrays, a spatial index (Quadtree) is better, but O(N) is fine for typical hikes < 10k points
            let minDist = Infinity;
            let closest = null;
            const mouseLat = e.latlng.lat;
            const mouseLng = e.latlng.lng;

            // Heuristic optimization: check every 2nd point to speed up
            for (let i = 0; i < points.length; i += 2) {
                const p = points[i];
                // Euclidean distance approximation is sufficient for "closest point on screen" logic at high zoom
                const d = Math.pow(p.lat - mouseLat, 2) + Math.pow(p.lon - mouseLng, 2);
                if (d < minDist) {
                    minDist = d;
                    closest = p;
                }
            }
            
            // Only trigger if reasonably close (avoid triggering when map is zoomed out and mouse is far)
            // 0.0001 degrees is roughly 11 meters
            if (minDist < 0.0005) { 
                onHover(closest);
            } else {
                if (minDist > 0.01) onHover(null);
            }
        },
        mouseout() {
            onHover(null);
        }
    });
    return null;
};

const RecenterMap = ({ positions }: { positions: [number, number][] }) => {
  const map = useMap();
  
  useEffect(() => {
    if (positions.length > 0) {
      const timer = setTimeout(() => {
          const bounds = L.latLngBounds(positions);
          map.invalidateSize();
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [positions, map]);
  
  return null;
};

interface MapDisplayProps {
  points: GPXPoint[];
  hoveredPoint: GPXPoint | null;
  onHoverPoint: (point: GPXPoint | null) => void;
}

const MapDisplay: React.FC<MapDisplayProps> = ({ points, hoveredPoint, onHoverPoint }) => {
  const positions = useMemo(() => 
    points.map(p => [p.lat, p.lon] as [number, number]), 
  [points]);

  if (positions.length === 0) return <div className="h-64 bg-gray-200 rounded flex items-center justify-center">No Map Data</div>;

  const startPos = positions[0];
  const endPos = positions[positions.length - 1];

  return (
    <div className="h-[450px] w-full rounded-lg overflow-hidden shadow-md border border-slate-200 z-0 relative">
      <MapContainer 
        center={startPos} 
        zoom={13} 
        scrollWheelZoom={false} 
        style={{ height: "100%", width: "100%" }}
      >
        <MapEvents points={points} onHover={onHoverPoint} />

        <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="OpenTopoMap (Topographic)">
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://opentopomap.org">OpenTopoMap</a>'
                  url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
                />
            </LayersControl.BaseLayer>
            
            <LayersControl.BaseLayer name="OpenStreetMap (Standard)">
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
            </LayersControl.BaseLayer>

            <LayersControl.BaseLayer name="CyclOSM (Paths/Trails)">
                 <TileLayer
                    attribution='&copy; <a href="https://github.com/cyclosm/cyclosm-cartocss-style/releases">CyclOSM</a> | ODbL'
                    url="https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png"
                />
            </LayersControl.BaseLayer>

             <LayersControl.BaseLayer name="Esri World Imagery (Satellite)">
                <TileLayer
                    attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                />
            </LayersControl.BaseLayer>
        </LayersControl>

        <Polyline 
            positions={positions} 
            pathOptions={{ color: '#ef4444', weight: 4, opacity: 0.8 }} 
        />
        <Marker position={startPos} icon={iconPerson}>
            <Popup>Start</Popup>
        </Marker>
        <Marker position={endPos} icon={iconPerson}>
            <Popup>Finish</Popup>
        </Marker>
        
        {hoveredPoint && (
            <CircleMarker 
                key={`${hoveredPoint.lat}-${hoveredPoint.lon}`} // Force re-render for instant update
                center={[hoveredPoint.lat, hoveredPoint.lon]} 
                radius={10} 
                pathOptions={{ color: 'white', fillColor: '#ef4444', fillOpacity: 1, weight: 3 }} 
            />
        )}

        <RecenterMap positions={positions} />
      </MapContainer>
    </div>
  );
};

export default MapDisplay;
