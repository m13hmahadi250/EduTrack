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

interface UserMarker {
  id: string;
  location: [number, number];
  name: string;
  image?: string;
  isOnline?: boolean;
}

interface MapTrackerProps {
  tutorLocation?: [number, number]; // Legacy support or single focal tutor
  studentLocation?: [number, number];
  tutorName?: string;
  studentName?: string;
  tutorImage?: string;
  studentImage?: string;
  eta?: { distance: string; minutes: number } | null;
  tutors?: UserMarker[]; // Support for multiple tutor markers
  students?: UserMarker[]; // Support for multiple student markers
}

const createCustomMarker = (color: string, name: string, image?: string, isOnline?: boolean) => {
  const content = image 
    ? `<img src="${image}" class="w-full h-full object-cover" referrerpolicy="no-referrer" />`
    : `<div class="w-full h-full bg-${color === 'rose-500' ? 'rose-50' : 'blue-50'} flex items-center justify-center text-[10px] font-black italic text-${color === 'rose-500' ? 'rose-500' : 'blue-500'}">
        ${name.charAt(0).toUpperCase()}
      </div>`;

  const borderColor = color === 'rose-500' ? '[#E51275]' : '[#0D5BFF]';
  const dotColor = color === 'rose-500' ? '[#E51275]' : '[#0D5BFF]';

  return L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div class="relative flex flex-col items-center">
        <div class="w-8 h-8 rounded-xl bg-white border-2 border-${borderColor} shadow-xl flex items-center justify-center overflow-hidden">
          ${content}
          ${isOnline !== false ? `<div class="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white animate-pulse"></div>` : ''}
        </div>
        <div class="w-0.5 h-2 bg-${dotColor}"></div>
      </div>
    `,
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -42]
  });
};

const MapTracker = memo(({ 
  tutorLocation, 
  studentLocation, 
  tutorName, 
  studentName, 
  tutorImage, 
  studentImage, 
  eta, 
  tutors,
  students 
}: MapTrackerProps) => {
  const center = useMemo<[number, number]>(() => {
    if (tutors && tutors.length > 0) return tutors[0].location;
    if (students && students.length > 0) return students[0].location;
    return tutorLocation || studentLocation || [23.8103, 90.4125];
  }, [tutorLocation, studentLocation, tutors, students]);
  
  return (
    <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false} attributionControl={false}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {/* Legacy/Contextual single tutor */}
      {!tutors && tutorLocation && (
        <Marker position={tutorLocation} icon={createCustomMarker('rose-500', tutorName || 'T', tutorImage)}>
          <Popup>
            <div className="p-2 min-w-[120px]">
              <div className="text-[10px] font-black uppercase italic text-rose-500 mb-1">
                {tutorName || 'Tutor'} Location
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

      {/* Legacy/Contextual single student */}
      {!students && studentLocation && (
        <Marker position={studentLocation} icon={createCustomMarker('blue-500', studentName || 'S', studentImage)}>
          <Popup>
            <div className="p-2 min-w-[120px]">
              <div className="text-[10px] font-black uppercase italic text-blue-500 mb-1">
                {studentName || 'Student'} Location
              </div>
            </div>
          </Popup>
        </Marker>
      )}

      {/* Multiple tutors */}
      {tutors?.map(tutor => (
        <Marker 
          key={tutor.id} 
          position={tutor.location} 
          icon={createCustomMarker('rose-500', tutor.name, tutor.image, tutor.isOnline)}
        >
          <Popup>
            <div className="p-2 min-w-[120px]">
              <div className="text-[10px] font-black uppercase italic text-rose-500 mb-1">
                {tutor.name} (Expert)
              </div>
              <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                Status: {tutor.isOnline ? 'Broadcasting' : 'Offline'}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Multiple students */}
      {students?.map(student => (
        <Marker 
          key={student.id} 
          position={student.location} 
          icon={createCustomMarker('blue-500', student.name, student.image, student.isOnline)}
        >
          <Popup>
            <div className="p-2 min-w-[120px]">
              <div className="text-[10px] font-black uppercase italic text-blue-500 mb-1">
                {student.name} (Student)
              </div>
              <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                Status: {student.isOnline ? 'Online' : 'Offline'}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}

      <MapRecenter lat={center[0]} lng={center[1]} />
    </MapContainer>
  );
});

export default MapTracker;
