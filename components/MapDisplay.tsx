import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, useMap, Marker, Popup, LayersControl } from 'react-leaflet';
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

const RecenterMap = ({ positions }: { positions: [number, number][] }) => {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions);
      // Invalidate size is crucial when map container might have changed size or initialized hidden
      map.invalidateSize();
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    }
  }, [positions, map]);
  return null;
};

interface MapDisplayProps {
  points: GPXPoint[];
}

const MapDisplay: React.FC<MapDisplayProps> = ({ points }) => {
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
            pathOptions={{ color: '#ef4444', weight: 4 }} 
        />
        <Marker position={startPos} icon={iconPerson}>
            <Popup>Start</Popup>
        </Marker>
        <Marker position={endPos} icon={iconPerson}>
            <Popup>Finish</Popup>
        </Marker>
        <RecenterMap positions={positions} />
      </MapContainer>
    </div>
  );
};

export default MapDisplay;