import { useEffect, useMemo, memo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAppStore } from '../store';
import { ZoomIn, ZoomOut, Focus, Navigation, ExternalLink } from 'lucide-react';
import MarkerClusterGroup from './MarkerClusterGroup';

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

interface UserMarker {
  id: string;
  location: [number, number];
  name: string;
  image?: string;
  isOnline?: boolean;
  subjects?: string[];
  rating?: number;
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
  const isRose = color === 'rose-500';
  const themeBgColor = isRose ? '#FFF1F2' : '#EFF6FF'; // rose-50 / blue-50
  const themeTextColor = isRose ? '#E11D48' : '#3B82F6'; // rose-600 / blue-600
  const themeBorderColor = isRose ? '#FC155D' : '#0D5BFF';
  const themeDotColor = isRose ? '#FC155D' : '#0D5BFF';

  const content = image 
    ? `<img src="${image}" style="width: 100%; height: 100%; object-fit: cover;" referrerpolicy="no-referrer" />`
    : `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 950; font-style: italic; color: ${themeTextColor}; background-color: ${themeBgColor};">
        ${name.charAt(0).toUpperCase()}
      </div>`;

  const sonarAnimation = isOnline !== false 
    ? `<style>
        @keyframes custom-sonar {
          0% { transform: scale(0.65); opacity: 0.9; }
          100% { transform: scale(1.6); opacity: 0; }
        }
       </style>`
    : '';

  // Dynamic pulsing glow ring for active/online status
  const glowRing = isOnline !== false 
    ? `<div style="position: absolute; width: 44px; height: 44px; top: -6px; left: -6px; border-radius: 12px; border: 2.5px solid ${themeDotColor}; opacity: 0.6; animation: custom-sonar 2s infinite ease-out; pointer-events: none; z-index: -1;"></div>`
    : '';

  return L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
        ${sonarAnimation}
        ${glowRing}
        <div style="width: 32px; height: 32px; border-radius: 10px; background-color: white; border: 2.5px solid ${themeBorderColor}; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.15), 0 4px 6px -2px rgba(0, 0, 0, 0.1); display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative;">
          ${content}
          ${isOnline !== false ? `<div style="position: absolute; top: -1.5px; right: -1.5px; width: 9px; height: 9px; background-color: #10B981; border-radius: 50%; border: 1.5px solid white;"></div>` : ''}
        </div>
        <div style="width: 2px; height: 8px; background-color: ${themeDotColor}; margin-top: -1px;"></div>
      </div>
    `,
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -42]
  });
};

function MapRecenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng]);
  }, [lat, lng, map]);
  return null;
}

function CustomMapHUD({ 
  center, 
  studentLocation, 
  tutorLocation, 
  tutors, 
  students 
}: { 
  center: [number, number]; 
  studentLocation?: [number, number]; 
  tutorLocation?: [number, number]; 
  tutors?: UserMarker[]; 
  students?: UserMarker[]; 
}) {
  const map = useMap();
  
  // Fit Bounds of all active markers
  const fitAllBounds = () => {
    const coords: [number, number][] = [];
    if (studentLocation) coords.push(studentLocation);
    if (tutorLocation) coords.push(tutorLocation);
    if (tutors) {
      tutors.forEach(t => {
        if (t.location) coords.push(t.location);
      });
    }
    if (students) {
      students.forEach(s => {
        if (s.location) coords.push(s.location);
      });
    }
    
    if (coords.length > 1) {
      map.fitBounds(coords, { padding: [50, 50], maxZoom: 15 });
    } else if (coords.length === 1) {
      map.setView(coords[0], 14);
    } else if (center) {
      map.setView(center, 13);
    }
  };

  const handleZoomIn = () => map.zoomIn();
  const handleZoomOut = () => map.zoomOut();
  
  const handleRecenter = () => {
    map.setView(center, 14);
  };

  // Trigger auto-fitbounds on load and count change
  useEffect(() => {
    const timer = setTimeout(() => {
      fitAllBounds();
    }, 600);
    return () => clearTimeout(timer);
  }, [studentLocation, tutorLocation, tutors?.length, students?.length]);

  return (
    <div className="absolute bottom-4 right-4 z-[1000] flex flex-col gap-1.5 p-1 bg-white/95 dark:bg-[#111A2E]/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/60 dark:border-slate-800/80 transition-colors">
      {/* Zoom In */}
      <button 
        type="button"
        onClick={handleZoomIn}
        className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-[#0D5BFF] hover:text-white dark:hover:bg-[#0D5BFF] dark:hover:text-white transition-all cursor-pointer border border-transparent hover:border-blue-200 dark:hover:border-transparent"
        title="Zoom In"
      >
        <ZoomIn className="w-4 h-4 stroke-[2.5]" />
      </button>

      {/* Zoom Out */}
      <button 
        type="button"
        onClick={handleZoomOut}
        className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-[#0D5BFF] hover:text-white dark:hover:bg-[#0D5BFF] dark:hover:text-white transition-all cursor-pointer border border-transparent hover:border-blue-200 dark:hover:border-transparent"
        title="Zoom Out"
      >
        <ZoomOut className="w-4 h-4 stroke-[2.5]" />
      </button>

      <div className="h-[1px] bg-slate-200/60 dark:bg-slate-800 mx-1" />

      {/* Recenter */}
      <button 
        type="button"
        onClick={handleRecenter}
        className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-[#0D5BFF] hover:text-white dark:hover:bg-[#0D5BFF] dark:hover:text-white transition-all cursor-pointer border border-transparent hover:border-blue-200 dark:hover:border-transparent"
        title="Recenter Map"
      >
        <Navigation className="w-4 h-4 stroke-[2.5] rotate-45" />
      </button>

      {/* Auto Fit Bounds */}
      <button 
        type="button"
        onClick={fitAllBounds}
        className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-[#0D5BFF] hover:text-white dark:hover:bg-[#0D5BFF] dark:hover:text-white transition-all cursor-pointer border border-transparent hover:border-blue-200 dark:hover:border-transparent"
        title="Fit All in View"
      >
        <Focus className="w-4 h-4 stroke-[2.5]" />
      </button>
    </div>
  );
}

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
  const { theme } = useAppStore();

  const [selectedTutorId, setSelectedTutorId] = useState<string | null>(null);

  const selectedTutorObj = useMemo(() => {
    if (!selectedTutorId) return null;
    if (tutors) {
      return tutors.find(t => t.id === selectedTutorId) || null;
    }
    if (tutorLocation && selectedTutorId === 'legacy_tutor') {
      return {
        id: 'legacy_tutor',
        location: tutorLocation,
        name: tutorName || 'Tutor',
        image: tutorImage,
      };
    }
    return null;
  }, [selectedTutorId, tutors, tutorLocation, tutorName, tutorImage]);

  const calculatedDistanceStr = useMemo(() => {
    if (!studentLocation || !selectedTutorObj) return null;
    try {
      const p1 = L.latLng(studentLocation[0], studentLocation[1]);
      const p2 = L.latLng(selectedTutorObj.location[0], selectedTutorObj.location[1]);
      const distanceInMeters = p1.distanceTo(p2);
      if (distanceInMeters < 1000) {
        return `${Math.round(distanceInMeters)} meters`;
      } else {
        return `${(distanceInMeters / 1000).toFixed(2)} km`;
      }
    } catch (err) {
      return null;
    }
  }, [studentLocation, selectedTutorObj]);

  const center = useMemo<[number, number]>(() => {
    if (tutors && tutors.length > 0) return tutors[0].location;
    if (students && students.length > 0) return students[0].location;
    return tutorLocation || studentLocation || [23.8103, 90.4125];
  }, [tutorLocation, studentLocation, tutors, students]);

  return (
    <div className="relative w-full h-full">
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false} attributionControl={false}>
        <TileLayer
          key={theme}
          url={theme === 'dark' 
            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
            : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          }
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        
        {/* Connection Polyline from Tutor to Student */}
        {tutorLocation && studentLocation && (
          <Polyline 
            positions={[tutorLocation, studentLocation]} 
            pathOptions={{ 
              color: '#0D5BFF', 
              weight: 3.5, 
              opacity: 0.9,
              className: 'animated-polyline'
            }} 
          />
        )}

        {/* Connection Polylines for multiple student markers relative to single tutorLocation */}
        {tutorLocation && students && students.map(student => (
          <Polyline 
            key={`line-${student.id}`}
            positions={[tutorLocation, student.location]} 
            pathOptions={{ 
              color: '#0D5BFF', 
              weight: 3.2, 
              opacity: 0.8,
              className: 'animated-polyline'
            }} 
          />
        ))}

        {/* Connection Polylines for multiple tutor markers relative to single studentLocation */}
        {studentLocation && tutors && tutors.map(tutor => (
          <Polyline 
            key={`line-${tutor.id}`}
            positions={[studentLocation, tutor.location]} 
            pathOptions={{ 
              color: '#0D5BFF', 
              weight: 3.2, 
              opacity: 0.8,
              className: 'animated-polyline'
            }} 
          />
        ))}

        {/* Animated Dashed Connection Path for Selected Tutor for Distance measurement */}
        {studentLocation && selectedTutorObj && (
          <Polyline 
            positions={[studentLocation, selectedTutorObj.location]} 
            pathOptions={{ 
              color: '#FC155D', 
              weight: 4.5, 
              opacity: 0.95,
              className: 'animated-dashed-distance-path'
            }} 
          />
        )}

        {/* Legacy/Contextual single tutor */}
        {!tutors && tutorLocation && (
          <Marker position={tutorLocation} icon={createCustomMarker('rose-500', tutorName || 'T', tutorImage, true)}>
            <Popup>
              <div className="p-2 min-w-[120px]">
                <div className="text-[10px] font-black uppercase italic text-rose-500 mb-1">
                  {tutorName || 'Tutor'} Location
                </div>
                {eta && (
                  <div className="flex flex-col gap-0.5 mb-2">
                    <div className="text-[14px] font-black text-[#0B132B] dark:text-white italic">
                      ~{eta.minutes} MINS
                    </div>
                    <div className="text-[8px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest">
                      Distance: {eta.distance} KM
                    </div>
                  </div>
                )}
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${tutorLocation[0]},${tutorLocation[1]}`}
                  target="_blank" 
                  rel="noreferrer"
                  className="mt-2 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[8.5px] font-black uppercase tracking-wider text-rose-555 dark:text-rose-450 hover:text-white bg-rose-50 hover:bg-rose-500 border border-rose-100 rounded-xl transition-all shadow-sm cursor-pointer no-underline text-center"
                >
                  <ExternalLink className="w-3 h-3" />
                  Google Maps
                </a>
                {studentLocation && (
                  <button 
                    type="button"
                    onClick={() => {
                      setSelectedTutorId(selectedTutorId === 'legacy_tutor' ? null : 'legacy_tutor');
                    }}
                    className={`mt-1.5 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-[8.5px] font-black uppercase tracking-wider rounded-xl transition-all shadow-sm cursor-pointer border ${
                      selectedTutorId === 'legacy_tutor'
                        ? 'bg-[#0D5BFF] hover:bg-blue-600 text-white border-transparent'
                        : 'bg-indigo-50 hover:bg-indigo-500 hover:text-white text-indigo-600 border-indigo-100 dark:bg-slate-800 dark:text-indigo-400 dark:border-slate-700 dark:hover:bg-indigo-600 dark:hover:text-white'
                    }`}
                  >
                    {selectedTutorId === 'legacy_tutor' ? '📍 Active Connection' : '📏 Measure Distance'}
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Legacy/Contextual single student */}
        {!students && studentLocation && (
          <Marker position={studentLocation} icon={createCustomMarker('blue-500', studentName || 'S', studentImage, true)}>
            <Popup>
              <div className="p-2 min-w-[120px]">
                <div className="text-[10px] font-black uppercase italic text-blue-500 mb-2">
                  {studentName || 'Student'} Location
                </div>
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${studentLocation[0]},${studentLocation[1]}`}
                  target="_blank" 
                  rel="noreferrer"
                  className="mt-2 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[8.5px] font-black uppercase tracking-wider text-[#0D5BFF] hover:text-white bg-blue-50 hover:bg-[#0D5BFF] border border-blue-100 rounded-xl transition-all shadow-sm cursor-pointer no-underline text-center"
                >
                  <ExternalLink className="w-3 h-3" />
                  Google Maps
                </a>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Multiple tutors */}
        {tutors && tutors.length > 0 && (
          <MarkerClusterGroup>
            {tutors.filter(t => t && t.location && Array.isArray(t.location) && t.location.length === 2 && typeof t.location[0] === 'number' && typeof t.location[1] === 'number').map(tutor => (
              <Marker 
                key={tutor.id} 
                position={tutor.location} 
                icon={createCustomMarker('rose-500', tutor.name, tutor.image, tutor.isOnline)}
              >
                <Popup>
                  <div className="p-2.5 min-w-[140px]">
                    <div className="text-[10px] font-black uppercase italic text-rose-500 mb-0.5">
                      {tutor.name} (Expert)
                    </div>
                    {tutor.rating !== undefined && (
                      <div className="text-[9.5px] font-black text-amber-500 uppercase tracking-wider mb-1">
                        ⭐ {tutor.rating > 0 ? tutor.rating.toFixed(1) : 'New'}
                      </div>
                    )}
                    {tutor.subjects && tutor.subjects.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2 max-w-[150px]">
                        {tutor.subjects.slice(0, 3).map((sub, idx) => (
                          <span key={idx} className="bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 text-[7px] font-extrabold uppercase px-1 py-0.5 rounded border border-rose-100/30">
                            {sub}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
                       Status: {tutor.isOnline ? 'Broadcasting' : 'Offline'}
                    </div>
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${tutor.location[0]},${tutor.location[1]}`}
                      target="_blank" 
                      rel="noreferrer"
                      className="mt-2 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[8.5px] font-black uppercase tracking-wider text-rose-555 dark:text-rose-450 hover:text-white bg-rose-50 hover:bg-rose-500 border border-rose-100 rounded-xl transition-all shadow-sm cursor-pointer no-underline text-center"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Google Maps
                    </a>
                    {studentLocation && (
                      <button 
                        type="button"
                        onClick={() => {
                          setSelectedTutorId(selectedTutorId === tutor.id ? null : tutor.id);
                        }}
                        className={`mt-1.5 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-[8.5px] font-black uppercase tracking-wider rounded-xl transition-all shadow-sm cursor-pointer border ${
                          selectedTutorId === tutor.id
                            ? 'bg-[#0D5BFF] hover:bg-blue-600 text-white border-transparent'
                            : 'bg-indigo-50 hover:bg-indigo-500 hover:text-white text-indigo-600 border-indigo-100 dark:bg-slate-800 dark:text-indigo-400 dark:border-slate-700 dark:hover:bg-indigo-600 dark:hover:text-white'
                        }`}
                      >
                        {selectedTutorId === tutor.id ? '📍 Active Connection' : '📏 Measure Distance'}
                      </button>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MarkerClusterGroup>
        )}

        {/* Multiple students */}
        {students?.filter(s => s && s.location && Array.isArray(s.location) && s.location.length === 2 && typeof s.location[0] === 'number' && typeof s.location[1] === 'number').map(student => (
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
                <div className="text-[8px] font-bold text-slate-400 dark:text-slate-555 uppercase tracking-widest mb-2">
                  Status: {student.isOnline ? 'Online' : 'Offline'}
                </div>
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${student.location[0]},${student.location[1]}`}
                  target="_blank" 
                  rel="noreferrer"
                  className="mt-2 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[8.5px] font-black uppercase tracking-wider text-[#0D5BFF] hover:text-white bg-blue-50 hover:bg-[#0D5BFF] border border-blue-100 rounded-xl transition-all shadow-sm cursor-pointer no-underline text-center"
                >
                  <ExternalLink className="w-3 h-3" />
                  Google Maps
                </a>
              </div>
            </Popup>
          </Marker>
        ))}

        <MapRecenter lat={center[0]} lng={center[1]} />
        <CustomMapHUD 
          center={center} 
          studentLocation={studentLocation} 
          tutorLocation={tutorLocation} 
          tutors={tutors} 
          students={students} 
        />
      </MapContainer>

      {/* Distance Ruler Floating HUD Overlay */}
      {studentLocation && selectedTutorObj && (
        <div className="absolute top-4 right-4 z-[1000] max-w-[200px] sm:max-w-64 p-3 sm:p-3.5 bg-white/95 dark:bg-[#111A2E]/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/60 dark:border-slate-800/80 transition-all animate-fade-in">
          <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-[#0D5BFF] italic mb-2">
            <span>📏</span>
            DISTANCE RULER
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {selectedTutorObj.image ? (
                <img src={selectedTutorObj.image} referrerPolicy="no-referrer" className="w-7 h-7 rounded-lg object-cover border border-slate-200 dark:border-slate-700" />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center font-black text-xs">
                  {selectedTutorObj.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex flex-col min-w-0 text-left">
                <div className="text-[10px] font-bold text-slate-800 dark:text-slate-200 truncate leading-tight">
                  {selectedTutorObj.name}
                </div>
                {selectedTutorObj.rating !== undefined && (
                  <div className="text-[7.5px] font-black text-amber-500 uppercase tracking-wider mt-0.5">
                    ⭐ {selectedTutorObj.rating > 0 ? selectedTutorObj.rating.toFixed(1) : 'New'}
                  </div>
                )}
                <div className="text-[8px] font-black text-[#FC155D] uppercase tracking-wide leading-none mt-0.5 animate-pulse">
                  {calculatedDistanceStr || 'Calculating...'}
                </div>
              </div>
            </div>
            
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedTutorId(null)}
                className="flex-1 py-1 px-2 text-[8px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-350 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-705 rounded-lg transition-colors cursor-pointer text-center border border-slate-200/40 dark:border-transparent"
              >
                Clear Path
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default MapTracker;
