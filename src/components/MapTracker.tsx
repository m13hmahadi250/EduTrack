import { useEffect } from 'react';
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
}

const tutorIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const studentIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function MapTracker({ tutorLocation, studentLocation, tutorName, studentName }: MapTrackerProps) {
  const center: [number, number] = tutorLocation || studentLocation || [23.8103, 90.4125];

  return (
    <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      
      {tutorLocation && (
        <Marker position={tutorLocation} icon={tutorIcon}>
          <Popup>
            <div className="text-[10px] font-black uppercase italic text-rose-500">
              {tutorName || 'Tutor'}'s Location
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
}
