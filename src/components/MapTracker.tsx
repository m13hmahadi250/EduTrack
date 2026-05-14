import { useEffect, useMemo, memo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix typical leaflet marker icon issue in React
// @ts-ignore
import iconMarker2x from 'leaflet/dist/images/marker-icon-2x.png';
// @ts-ignore
import iconMarker from 'leaflet/dist/images/marker-icon.png';
// @ts-ignore
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconMarker2x,
  iconUrl: iconMarker,
  shadowUrl: iconShadow,
});

function MapRecenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng]);
  }, [lat, lng, map]);
  return null;
}

interface MapTrackerProps {
  tutorLocation?: [number, number];
  studentLocation?: [number, number];
  tutorName?: string;
  studentName?: string;
  eta?: { distance: string; minutes: number } | null;
}

const createCustomMarker = (color: string, name: string) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div class="relative flex flex-col items-center">
        <div class="w-8 h-8 rounded-xl bg-white border-2 border-${color === 'rose-500' ? '[#E51275]' : '[#0D5BFF]'} shadow-xl flex items-center justify-center overflow-hidden">
          <div class="w-full h-full bg-${color === 'rose-500' ? 'rose-50' : 'blue-50'} flex items-center justify-center text-[10px] font-black italic text-${color === 'rose-500' ? 'rose-500' : 'blue-500'}">
            ${name.charAt(0).toUpperCase()}
          </div>
          <div class="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white animate-pulse"></div>
        </div>
        <div class="w-0.5 h-2 bg-${color === 'rose-500' ? '[#E51275]' : '[#0D5BFF]'}"></div>
      </div>
    `,
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -42]
  });
};

const MapTracker = memo(({ tutorLocation, studentLocation, tutorName, studentName, eta }: MapTrackerProps) => {
  const center = useMemo<[number, number]>(() => tutorLocation || studentLocation || [23.8103, 90.4125], [tutorLocation, studentLocation]);
  
  const tutorIcon = useMemo(() => createCustomMarker('rose-500', tutorName || 'T'), [tutorName]);
  const studentIcon = useMemo(() => createCustomMarker('blue-500', studentName || 'S'), [studentName]);

  return (
    <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      
      {tutorLocation && (
        <Marker position={tutorLocation} icon={tutorIcon}>
          <Popup>
            <div className="p-2 min-w-[120px]">
              <div className="text-[10px] font-black uppercase italic text-rose-500 mb-1">
                {tutorName || 'Tutor'} Incoming
              </div>
              {eta && (
                <div className="flex flex-col gap-0.5">
                  <div className="text-[14px] font-black text-[#0B132B] italic">
                    ~{eta.minutes} MINS
                  </div>
                  <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                    Distance: {eta.distance} KM
                  </div>
                </div>
              )}
            </div>
          </Popup>
        </Marker>
      )}

      {studentLocation && (
        <Marker position={studentLocation} icon={studentIcon}>
          <Popup>
            <div className="text-[10px] font-black uppercase italic text-blue-500">
              {studentName || 'Student'}'s Location
            </div>
          </Popup>
        </Marker>
      )}

      <MapRecenter lat={center[0]} lng={center[1]} />
    </MapContainer>
  );
});

export default MapTracker;
