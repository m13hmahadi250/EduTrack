import { useEffect, useMemo, memo, useState, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { useAppStore } from '../store';
import { ZoomIn, ZoomOut, Focus, Navigation, MapPin } from 'lucide-react';
import { getCurrentAccuratePosition, watchAccuratePosition } from '../utils/geocoding';

// Fix typical leaflet marker icon assets
// @ts-ignore
import iconMarker2x from 'leaflet/dist/images/marker-icon-2x.png';
// @ts-ignore
import iconMarker from 'leaflet/dist/images/marker-icon.png';
// @ts-ignore
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

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
  tutorLocation?: [number, number];
  studentLocation?: [number, number];
  tutorName?: string;
  studentName?: string;
  tutorImage?: string;
  studentImage?: string;
  eta?: { distance: string; minutes: number } | null;
  tutors?: UserMarker[];
  students?: UserMarker[];
}

const createCustomMarker = (color: string, name: string, image?: string, isOnline?: boolean) => {
  const isRose = color === 'rose-500';
  const themeBgColor = isRose ? '#FFF1F2' : '#EFF6FF';
  const themeTextColor = isRose ? '#E11D48' : '#3B82F6';
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

function CustomMapHUD({ 
  map,
  center, 
  studentLocation, 
  tutorLocation, 
  tutors, 
  students,
  isPinningMode,
  setIsPinningMode,
  hasUser
}: { 
  map: L.Map | null;
  center: [number, number]; 
  studentLocation?: [number, number]; 
  tutorLocation?: [number, number]; 
  tutors?: UserMarker[]; 
  students?: UserMarker[]; 
  isPinningMode: boolean;
  setIsPinningMode: (val: boolean) => void;
  hasUser: boolean;
}) {
  const fitAllBounds = () => {
    if (!map) return;
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

  const handleZoomIn = () => map?.zoomIn();
  const handleZoomOut = () => map?.zoomOut();
  const handleRecenter = () => {
    if (map && center) map.setView(center, 14);
  };

  useEffect(() => {
    if (!map) return;
    const timer = setTimeout(() => {
      fitAllBounds();
    }, 600);
    return () => clearTimeout(timer);
  }, [map, studentLocation, tutorLocation, tutors?.length, students?.length]);

  return (
    <div className="absolute bottom-4 right-4 z-[1000] flex flex-col gap-1.5 p-1 bg-white/95 dark:bg-[#111A2E]/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/60 dark:border-slate-800/80 transition-colors">
      <button 
        type="button"
        onClick={handleZoomIn}
        className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-[#0D5BFF] hover:text-white dark:hover:bg-[#0D5BFF] dark:hover:text-white transition-all cursor-pointer border border-transparent hover:border-blue-200 dark:hover:border-transparent"
        title="Zoom In"
      >
        <ZoomIn className="w-4 h-4 stroke-[2.5]" />
      </button>

      <button 
        type="button"
        onClick={handleZoomOut}
        className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-[#0D5BFF] hover:text-white dark:hover:bg-[#0D5BFF] dark:hover:text-white transition-all cursor-pointer border border-transparent hover:border-blue-200 dark:hover:border-transparent"
        title="Zoom Out"
      >
        <ZoomOut className="w-4 h-4 stroke-[2.5]" />
      </button>

      <div className="h-[1px] bg-slate-200/60 dark:bg-slate-800 mx-1" />

      {hasUser && (
        <button 
          type="button"
          onClick={() => setIsPinningMode(!isPinningMode)}
          className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all cursor-pointer border ${
            isPinningMode 
              ? 'bg-amber-500 text-white border-amber-400 animate-pulse shadow-md' 
              : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-amber-500 hover:text-white dark:hover:bg-amber-500 dark:hover:text-white border-transparent'
          }`}
          title={isPinningMode ? "Click Map to Set Location" : "Map Pin Placement (Manual Location Calibration)"}
        >
          <MapPin className="w-4 h-4 stroke-[2.5]" />
        </button>
      )}

      <button 
        type="button"
        onClick={handleRecenter}
        className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-[#0D5BFF] hover:text-white dark:hover:bg-[#0D5BFF] dark:hover:text-white transition-all cursor-pointer border border-transparent hover:border-blue-200 dark:hover:border-transparent"
        title="Recenter Map"
      >
        <Navigation className="w-4 h-4 stroke-[2.5] rotate-45" />
      </button>

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
  const { theme, currentUser, updateLocation } = useAppStore();

  const [selectedTutorId, setSelectedTutorId] = useState<string | null>(null);
  const [isPinningMode, setIsPinningMode] = useState(false);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const isPinningModeRef = useRef(isPinningMode);
  isPinningModeRef.current = isPinningMode;

  const handleMapClick = async (lat: number, lng: number) => {
    if (!currentUser) return;
    try {
      await updateLocation(currentUser.id, lat, lng);
      setIsPinningMode(false);
      useAppStore.getState().sendNotification(
        currentUser.id,
        "Location Set",
        `Coordinates manually calibrated on the tracking radar to [${lat.toFixed(4)}, ${lng.toFixed(4)}].`,
        "success"
      );
    } catch (err) {
      console.error("Failed to update manual coordinate placement:", err);
    }
  };

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

  // Safely initialize Leaflet defaults & marker cluster in client lifecycle
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).L = L;
      try {
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: iconMarker2x,
          iconUrl: iconMarker,
          shadowUrl: iconShadow,
        });
      } catch (err) {
        console.warn('Leaflet icon config warning:', err);
      }

      if (!(L as any).markerClusterGroup) {
        import('leaflet.markercluster').catch(() => {});
      }
    }
  }, []);

  // Geolocation tracking logic safely managed within useEffect block
  useEffect(() => {
    if (!currentUser?.id) return;
    if (typeof window === 'undefined' || !('navigator' in window)) return;

    let currentWatchId: number | null = null;

    if ('geolocation' in navigator) {
      currentWatchId = watchAccuratePosition(
        (position) => {
          updateLocation(currentUser.id, position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.warn("High accuracy tracking unavailable, trying single accurate fix:", error);
          getCurrentAccuratePosition(
            (pos) => updateLocation(currentUser.id, pos.coords.latitude, pos.coords.longitude),
            (err) => {
              console.warn("Location fix failed, falling back to metropolitan center:", err);
              updateLocation(currentUser.id, 23.8103, 90.4125);
            }
          );
        }
      );
    } else {
      updateLocation(currentUser.id, 23.8103, 90.4125);
    }

    return () => {
      if (currentWatchId !== null && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(currentWatchId);
      }
    };
  }, [currentUser?.id, updateLocation]);

  // Map Instance Initialization safely managed inside useEffect block
  useEffect(() => {
    if (!containerRef.current || mapInstance) return;

    const map = L.map(containerRef.current, {
      center: center,
      zoom: 13,
      zoomControl: false,
      attributionControl: false,
    });

    const tileUrl = theme === 'dark' 
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
      : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

    const tileLayer = L.tileLayer(tileUrl, {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    });
    tileLayer.on('tileerror', () => {
      // Ignore tile load failures when offline
    });
    tileLayer.addTo(map);

    tileLayerRef.current = tileLayer;

    const layerGroup = L.layerGroup().addTo(map);
    layerGroupRef.current = layerGroup;

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (isPinningModeRef.current) {
        handleMapClick(e.latlng.lat, e.latlng.lng);
      }
    });

    map.on('popupopen', (e) => {
      const popupNode = e.popup.getElement();
      if (!popupNode) return;
      const buttons = popupNode.querySelectorAll('[data-tutor-id]');
      buttons.forEach(btn => {
        (btn as HTMLButtonElement).onclick = () => {
          const tid = btn.getAttribute('data-tutor-id');
          if (tid) {
            setSelectedTutorId(prev => prev === tid ? null : tid);
          }
        };
      });
    });

    setMapInstance(map);

    return () => {
      map.remove();
      setMapInstance(null);
      tileLayerRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  // Handle container resizing cleanly with ResizeObserver to ensure map container size is valid
  useEffect(() => {
    if (!mapInstance || !containerRef.current) return;

    let resizeTimer: any;
    const observer = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        try {
          mapInstance.invalidateSize();
        } catch (err) {
          console.warn("Resize invalidation warning:", err);
        }
      }, 100);
    });

    observer.observe(containerRef.current);
    mapInstance.invalidateSize();

    return () => {
      observer.disconnect();
      clearTimeout(resizeTimer);
    };
  }, [mapInstance]);

  // Update Theme
  useEffect(() => {
    if (!tileLayerRef.current) return;
    const tileUrl = theme === 'dark' 
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
      : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
    tileLayerRef.current.setUrl(tileUrl);
  }, [theme]);

  // Update Layers (Polylines and Markers)
  useEffect(() => {
    if (!mapInstance || !layerGroupRef.current) return;

    const group = layerGroupRef.current;
    group.clearLayers();

    // 1. Connection Polyline from Tutor to Student
    if (tutorLocation && studentLocation) {
      L.polyline([tutorLocation, studentLocation], {
        color: '#0D5BFF',
        weight: 3.5,
        opacity: 0.9,
        className: 'animated-polyline'
      }).addTo(group);
    }

    // 2. Connection Polylines for multiple student markers relative to single tutorLocation
    if (tutorLocation && students) {
      students.forEach(student => {
        L.polyline([tutorLocation, student.location], {
          color: '#0D5BFF',
          weight: 3.2,
          opacity: 0.8,
          className: 'animated-polyline'
        }).addTo(group);
      });
    }

    // 3. Connection Polylines for multiple tutor markers relative to single studentLocation
    if (studentLocation && tutors) {
      tutors.forEach(tutor => {
        L.polyline([studentLocation, tutor.location], {
          color: '#0D5BFF',
          weight: 3.2,
          opacity: 0.8,
          className: 'animated-polyline'
        }).addTo(group);
      });
    }

    // 4. Animated Dashed Connection Path for Selected Tutor
    if (studentLocation && selectedTutorObj) {
      L.polyline([studentLocation, selectedTutorObj.location], {
        color: '#FC155D',
        weight: 4.5,
        opacity: 0.95,
        className: 'animated-dashed-distance-path'
      }).addTo(group);
    }

    // 5. Legacy/Contextual single tutor marker
    if (!tutors && tutorLocation) {
      const popupHtml = `
        <div style="padding: 8px; min-width: 120px;">
          <div style="font-size: 10px; font-weight: 900; text-transform: uppercase; font-style: italic; color: #f43f5e; margin-bottom: 4px;">
            ${tutorName || 'Tutor'} Location
          </div>
          ${eta ? `
            <div style="display: flex; flex-direction: column; gap: 2px; margin-bottom: 8px;">
              <div style="font-size: 14px; font-weight: 900; font-style: italic; color: #0B132B;">
                ~${eta.minutes} MINS
              </div>
              <div style="font-size: 8px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em;">
                Distance: ${eta.distance} KM
              </div>
            </div>
          ` : ''}
          <a href="https://www.google.com/maps/search/?api=1&query=${tutorLocation[0]},${tutorLocation[1]}"
             target="_blank" rel="noreferrer"
             style="margin-top: 8px; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 6px 12px; font-size: 8.5px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; color: #e11d48; background-color: #fff1f2; border: 1px solid #ffe4e6; border-radius: 12px; text-decoration: none;">
            Google Maps
          </a>
          ${studentLocation ? `
            <button type="button" data-tutor-id="legacy_tutor"
              style="margin-top: 6px; width: 100%; display: flex; align-items: center; justify-content: center; padding: 6px 12px; font-size: 8.5px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; border-radius: 12px; cursor: pointer; border: 1px solid ${selectedTutorId === 'legacy_tutor' ? 'transparent' : '#e0e7ff'}; background-color: ${selectedTutorId === 'legacy_tutor' ? '#0D5BFF' : '#eef2ff'}; color: ${selectedTutorId === 'legacy_tutor' ? '#ffffff' : '#4f46e5'};">
              ${selectedTutorId === 'legacy_tutor' ? '📍 Active Connection' : '📏 Measure Distance'}
            </button>
          ` : ''}
        </div>
      `;

      L.marker(tutorLocation, { icon: createCustomMarker('rose-500', tutorName || 'T', tutorImage, true) })
        .bindPopup(popupHtml)
        .addTo(group);
    }

    // 6. Legacy/Contextual single student marker
    if (!students && studentLocation) {
      const popupHtml = `
        <div style="padding: 8px; min-width: 120px;">
          <div style="font-size: 10px; font-weight: 900; text-transform: uppercase; font-style: italic; color: #3b82f6; margin-bottom: 8px;">
            ${studentName || 'Student'} Location
          </div>
          <a href="https://www.google.com/maps/search/?api=1&query=${studentLocation[0]},${studentLocation[1]}"
             target="_blank" rel="noreferrer"
             style="margin-top: 8px; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 6px 12px; font-size: 8.5px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; color: #0D5BFF; background-color: #eff6ff; border: 1px solid #dbeafe; border-radius: 12px; text-decoration: none;">
            Google Maps
          </a>
        </div>
      `;

      L.marker(studentLocation, { icon: createCustomMarker('blue-500', studentName || 'S', studentImage, true) })
        .bindPopup(popupHtml)
        .addTo(group);
    }

    // 7. Multiple tutors (using markerClusterGroup if available, or layerGroup)
    if (tutors && tutors.length > 0) {
      const clusterGroup = (L as any).markerClusterGroup ? (L as any).markerClusterGroup({
        showCoverageOnHover: false,
        maxClusterRadius: 40
      }) : L.layerGroup();

      tutors.forEach(tutor => {
        const subjectsHtml = tutor.subjects && tutor.subjects.length > 0 
          ? `<div style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px; max-width: 150px;">
              ${tutor.subjects.slice(0, 3).map(sub => `<span style="background-color: #fff1f2; color: #e11d48; font-size: 7px; font-weight: 800; text-transform: uppercase; padding: 2px 4px; border-radius: 4px; border: 1px solid #ffe4e6;">${sub}</span>`).join('')}
             </div>`
          : '';

        const popupHtml = `
          <div style="padding: 10px; min-width: 140px;">
            <div style="font-size: 10px; font-weight: 900; text-transform: uppercase; font-style: italic; color: #f43f5e; margin-bottom: 2px;">
              ${tutor.name} (Expert)
            </div>
            ${tutor.rating !== undefined ? `
              <div style="font-size: 9.5px; font-weight: 900; color: #f59e0b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">
                ⭐ ${tutor.rating > 0 ? tutor.rating.toFixed(1) : 'New'}
              </div>
            ` : ''}
            ${subjectsHtml}
            <div style="font-size: 8px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">
              Status: ${tutor.isOnline ? 'Broadcasting' : 'Offline'}
            </div>
            <a href="https://www.google.com/maps/search/?api=1&query=${tutor.location[0]},${tutor.location[1]}"
               target="_blank" rel="noreferrer"
               style="margin-top: 8px; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 6px 12px; font-size: 8.5px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; color: #e11d48; background-color: #fff1f2; border: 1px solid #ffe4e6; border-radius: 12px; text-decoration: none;">
              Google Maps
            </a>
            ${studentLocation ? `
              <button type="button" data-tutor-id="${tutor.id}"
                style="margin-top: 6px; width: 100%; display: flex; align-items: center; justify-content: center; padding: 6px 12px; font-size: 8.5px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; border-radius: 12px; cursor: pointer; border: 1px solid ${selectedTutorId === tutor.id ? 'transparent' : '#e0e7ff'}; background-color: ${selectedTutorId === tutor.id ? '#0D5BFF' : '#eef2ff'}; color: ${selectedTutorId === tutor.id ? '#ffffff' : '#4f46e5'};">
                ${selectedTutorId === tutor.id ? '📍 Active Connection' : '📏 Measure Distance'}
              </button>
            ` : ''}
          </div>
        `;

        const marker = L.marker(tutor.location, {
          icon: createCustomMarker('rose-500', tutor.name, tutor.image, tutor.isOnline)
        }).bindPopup(popupHtml);

        clusterGroup.addLayer(marker);
      });

      group.addLayer(clusterGroup);
    }

    // 8. Multiple students
    if (students && students.length > 0) {
      students.forEach(student => {
        const popupHtml = `
          <div style="padding: 8px; min-width: 120px;">
            <div style="font-size: 10px; font-weight: 900; text-transform: uppercase; font-style: italic; color: #3b82f6; margin-bottom: 4px;">
              ${student.name} (Student)
            </div>
            <div style="font-size: 8px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">
              Status: ${student.isOnline ? 'Online' : 'Offline'}
            </div>
            <a href="https://www.google.com/maps/search/?api=1&query=${student.location[0]},${student.location[1]}"
               target="_blank" rel="noreferrer"
               style="margin-top: 8px; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 6px 12px; font-size: 8.5px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; color: #0D5BFF; background-color: #eff6ff; border: 1px solid #dbeafe; border-radius: 12px; text-decoration: none;">
              Google Maps
            </a>
          </div>
        `;

        L.marker(student.location, {
          icon: createCustomMarker('blue-500', student.name, student.image, student.isOnline)
        }).bindPopup(popupHtml).addTo(group);
      });
    }

  }, [mapInstance, tutorLocation, studentLocation, tutorName, studentName, tutorImage, studentImage, eta, tutors, students, selectedTutorId, selectedTutorObj]);

  return (
    <div className="relative w-full h-full min-h-[320px] @container [container-type:size] overflow-hidden">
      <div 
        ref={containerRef} 
        className="w-full h-full min-h-[320px] relative z-0" 
        style={{ width: '100%', height: '100%', minHeight: '320px' }} 
      />

      <CustomMapHUD 
        map={mapInstance}
        center={center} 
        studentLocation={studentLocation} 
        tutorLocation={tutorLocation} 
        tutors={tutors} 
        students={students} 
        isPinningMode={isPinningMode}
        setIsPinningMode={setIsPinningMode}
        hasUser={!!currentUser}
      />

      {/* Manual Pinning Instructions Overlay */}
      {isPinningMode && (
        <div className="absolute top-4 left-4 z-[1000] p-3.5 sm:p-4 bg-amber-500 text-white rounded-2xl shadow-xl border border-amber-400/50 font-sans max-w-[240px] sm:max-w-xs animate-fade-in">
          <p className="text-[9px] font-black uppercase tracking-[0.15em] mb-1 text-amber-100 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            CALIBRATING LOCATION
          </p>
          <p className="text-[10px] sm:text-xs font-bold leading-normal text-white">
            Tap/click anywhere on the map grid to manually place your radar pin drop.
          </p>
          <button 
            type="button"
            onClick={() => setIsPinningMode(false)}
            className="mt-2.5 px-3 py-1 bg-white hover:bg-slate-100 text-amber-600 font-black text-[9px] uppercase tracking-widest rounded-lg transition-all cursor-pointer shadow-sm active:scale-95 border-none"
          >
            Cancel
          </button>
        </div>
      )}

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
                className="flex-1 py-1 px-2 text-[8px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-350 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer text-center border border-slate-200/40 dark:border-transparent"
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
