import { useEffect, useMemo, memo, useState, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import { useAppStore } from '../store';
import { ZoomIn, ZoomOut, Focus, Navigation, MapPin, Crosshair, Route } from 'lucide-react';
import { getCurrentAccuratePosition, watchAccuratePosition } from '../utils/geocoding';
import UserAvatar, { getAvatarInitials, isValidAvatarUrl } from './UserAvatar';
import {
  fetchAuthorizedTutorPhoto,
  getCachedAuthorizedPhotoUrl,
  isAuthorizedProxyPhotoUrl,
  parseAuthorizedProxyPhotoUrl,
  subscribeAuthorizedPhotoCache,
} from '../lib/authorizedMedia';

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
  lastActiveAt?: string;
  lastLocationUpdatedAt?: string;
  isLastKnownLocation?: boolean;
  district?: string;
  thana?: string;
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

export function formatTimeAgo(isoString?: string): string {
  if (!isoString) return 'Recently';
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    if (diffMs < 0 || isNaN(diffMs)) return 'Recently';
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch (e) {
    return 'Recently';
  }
}

// Custom Circular HTML DivIcon Generator for Ride-Sharing / Delivery Tracking UI
const createCustomCircularMarker = (
  type: 'start' | 'destination' | 'tutor' | 'student',
  name: string,
  image?: string,
  isOnline?: boolean,
  roleLabel?: string,
  isLastKnownLocation?: boolean
) => {
  const isStart = type === 'start' || type === 'tutor';
  const isLive = isOnline !== false && !isLastKnownLocation;
  
  // Dynamic color palette: Emerald/Teal when live, Amber/Slate when showing last known position
  const themeColor = isLive 
    ? (isStart ? '#10b981' : '#06b6d4') 
    : (isStart ? '#d97706' : '#64748b');
  const themeBg = isLive
    ? (isStart ? '#ecfdf5' : '#ecfeff')
    : (isStart ? '#fffbeb' : '#f8fafc');
  const badgeText = isLive 
    ? (roleLabel || (isStart ? 'LIVE TUTOR' : 'LIVE STUDENT'))
    : (isLastKnownLocation ? 'LAST LOCATION' : (roleLabel || 'OFFLINE'));
  const badgeBg = isLive
    ? (isStart ? '#10b981' : '#0891b2')
    : (isStart ? '#b45309' : '#475569');

  const safeInitials = getAvatarInitials(name);
  let resolvedImage = '';
  if (image && isAuthorizedProxyPhotoUrl(image)) {
    const parsedProxy = parseAuthorizedProxyPhotoUrl(image);
    const cachedBlob = parsedProxy
      ? getCachedAuthorizedPhotoUrl(parsedProxy.tutorId, parsedProxy.version)
      : null;
    resolvedImage = cachedBlob || '';
  } else if (isValidAvatarUrl(image)) {
    resolvedImage = image!;
  }
  const safeImage = resolvedImage ? resolvedImage.replace(/"/g, '&quot;') : '';
  const avatarContent = safeImage
    ? `<img src="${safeImage}" alt="" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" referrerpolicy="no-referrer" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" /><div style="display: none; width: 100%; height: 100%; border-radius: 50%; align-items: center; justify-content: center; font-size: 13px; font-weight: 900; color: ${themeColor}; background: ${themeBg};">${safeInitials}</div>`
    : `<div style="width: 100%; height: 100%; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 900; color: ${themeColor}; background: ${themeBg};">
        ${safeInitials}
      </div>`;

  return L.divIcon({
    className: 'custom-circular-marker',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center;">
        <!-- Pulsing Aura Ring (Only active when live) -->
        ${isLive ? `
          <div style="position: absolute; width: 48px; height: 48px; border-radius: 50%; background-color: ${themeColor}; opacity: 0.35; animation: custom-sonar 2s infinite ease-out; pointer-events: none; z-index: -1;"></div>
        ` : ''}
        
        <!-- Circular Avatar Frame -->
        <div style="width: 40px; height: 40px; border-radius: 50%; background-color: #ffffff; border: 3px solid ${themeColor}; box-shadow: 0 10px 25px -3px rgba(0,0,0,0.3), 0 4px 10px -2px rgba(0,0,0,0.15); display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative;">
          ${avatarContent}
          <div style="position: absolute; bottom: 1px; right: 1px; width: 9px; height: 9px; background-color: ${isLive ? '#10b981' : '#94a3b8'}; border-radius: 50%; border: 1.5px solid white;"></div>
        </div>

        <!-- Role / Status Badge Tag -->
        <div style="margin-top: 3px; background-color: ${badgeBg}; color: white; font-size: 7.5px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; padding: 2px 6px; border-radius: 9999px; box-shadow: 0 2px 6px rgba(0,0,0,0.25); white-space: nowrap; display: flex; align-items: center; gap: 3px;">
          ${isLive ? '● ' : '📍 '}${badgeText}
        </div>
      </div>
    `,
    iconSize: [48, 60],
    iconAnchor: [24, 30],
    popupAnchor: [0, -32]
  });
};

export type MapLayerPresetId = 'streets' | 'dark' | 'satellite';

const CARTO_API_KEY = import.meta.env.VITE_CARTO_API_KEY || 'cb1_4oqt_1_47aa608d8c912d66e171fd88';

export const MAP_LAYER_PRESETS: Record<MapLayerPresetId, {
  id: MapLayerPresetId;
  label: string;
  shortLabel: string;
  url: string;
  attribution: string;
  maxZoom: number;
}> = {
  streets: {
    id: 'streets',
    label: 'Clean Streets',
    shortLabel: 'Streets',
    url: `https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${CARTO_API_KEY}`,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20,
  },
  dark: {
    id: 'dark',
    label: 'Tactical Dark',
    shortLabel: 'Dark',
    url: `https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${CARTO_API_KEY}`,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 19,
  },
  satellite: {
    id: 'satellite',
    label: 'Satellite Imagery',
    shortLabel: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and GIS Community',
    maxZoom: 18,
  }
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
  hasUser,
  activeLayer,
  onSelectLayer,
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
  activeLayer: MapLayerPresetId;
  onSelectLayer: (layer: MapLayerPresetId) => void;
}) {
  const { currentUser, updateLocation } = useAppStore();
  const [isSyncing, setIsSyncing] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const handleSyncGPS = () => {
    if (!currentUser?.id) return;
    setIsSyncing(true);
    setGpsError(null);
    getCurrentAccuratePosition(
      (pos) => {
        updateLocation(currentUser.id, pos.coords.latitude, pos.coords.longitude);
        setIsSyncing(false);
        if (map) {
          map.setView([pos.coords.latitude, pos.coords.longitude], 15);
        }
      },
      () => {
        setIsSyncing(false);
        setGpsError('Location permission denied or unavailable. Use the map pin button to set your location.');
        setTimeout(() => setGpsError(null), 5000);
      }
    );
  };

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
  }, [map, studentLocation?.[0], studentLocation?.[1], tutorLocation?.[0], tutorLocation?.[1], tutors?.length, students?.length]);

  return (
    <>
      {/* Top Left: Live GPS / Last Location Status Badge */}
      {hasUser && (
        <div className="absolute top-3 left-3 z-[1000] flex flex-col gap-1.5 max-w-[calc(100%-1.5rem)]">
          <div className="flex items-center gap-2 bg-white/95 dark:bg-[#111A2E]/95 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg border border-slate-200/60 dark:border-slate-800/80 w-fit">
            {currentUser?.isOnline !== false && currentUser?.location ? (
              <>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] font-black tracking-wider text-emerald-700 dark:text-emerald-400 uppercase">
                  Live GPS
                </span>
              </>
            ) : (
              <>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500 inline-block"></span>
                </span>
                <span className="text-[10px] font-black tracking-wider text-amber-700 dark:text-amber-400 uppercase flex items-center gap-1">
                  Last Location <span className="text-[9px] opacity-80 font-medium lowercase">({formatTimeAgo(currentUser?.lastLocationUpdatedAt || currentUser?.lastActiveAt)})</span>
                </span>
              </>
            )}
            <button
              type="button"
              onClick={handleSyncGPS}
              disabled={isSyncing}
              className="ml-1 min-w-[32px] min-h-[32px] p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-emerald-600 transition-colors cursor-pointer flex items-center justify-center"
              title="Refresh Live GPS Coordinates"
            >
              <Crosshair className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-500' : ''}`} />
            </button>
          </div>
          {gpsError && (
            <div className="px-3 py-1.5 rounded-xl bg-amber-500 text-white text-[11px] font-semibold shadow-lg max-w-[260px]">
              {gpsError}
            </div>
          )}
        </div>
      )}

      {/* Bottom Left: Tile Layer Preset Selector */}
      <div className="absolute bottom-4 left-4 z-[1000] flex items-center gap-1 bg-white/95 dark:bg-[#111A2E]/95 backdrop-blur-md p-1 rounded-2xl shadow-xl border border-slate-200/60 dark:border-slate-800/80">
        {(['streets', 'dark', 'satellite'] as MapLayerPresetId[]).map((layerId) => {
          const preset = MAP_LAYER_PRESETS[layerId];
          const isActive = activeLayer === layerId;
          return (
            <button
              key={layerId}
              type="button"
              onClick={() => onSelectLayer(layerId)}
              className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-[8.5px] sm:text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                isActive
                  ? layerId === 'satellite'
                    ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-500/40'
                    : layerId === 'dark'
                      ? 'bg-[#0B132B] dark:bg-slate-950 text-white shadow-sm border border-slate-700/60 ring-1 ring-slate-700/40'
                      : 'bg-[#0D5BFF] text-white shadow-sm ring-1 ring-blue-500/40'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80'
              }`}
              title={preset.label}
            >
              <span className="hidden sm:inline">{preset.label}</span>
              <span className="sm:hidden">{preset.shortLabel}</span>
            </button>
          );
        })}
      </div>

      {/* Bottom Right: Map Zoom, Calibration Pin, Recenter & Focus Controls */}
      <div className="absolute bottom-4 right-3 sm:right-4 z-[1000] flex flex-col gap-1.5 p-1 bg-white/95 dark:bg-[#111A2E]/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/60 dark:border-slate-800/80 transition-colors">
        <button 
          type="button"
          onClick={handleZoomIn}
          className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-[#0D5BFF] hover:text-white dark:hover:bg-[#0D5BFF] dark:hover:text-white transition-all cursor-pointer border border-transparent hover:border-blue-200 dark:hover:border-transparent"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4 stroke-[2.5]" />
        </button>

        <button 
          type="button"
          onClick={handleZoomOut}
          className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-[#0D5BFF] hover:text-white dark:hover:bg-[#0D5BFF] dark:hover:text-white transition-all cursor-pointer border border-transparent hover:border-blue-200 dark:hover:border-transparent"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4 stroke-[2.5]" />
        </button>

        <div className="h-[1px] bg-slate-200/60 dark:bg-slate-800 mx-1" />

        {hasUser && (
          <button 
            type="button"
            onClick={() => setIsPinningMode(!isPinningMode)}
            className={`w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-xl transition-all cursor-pointer border ${
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
          className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-[#0D5BFF] hover:text-white dark:hover:bg-[#0D5BFF] dark:hover:text-white transition-all cursor-pointer border border-transparent hover:border-blue-200 dark:hover:border-transparent"
          title="Recenter Map"
        >
          <Navigation className="w-4 h-4 stroke-[2.5] rotate-45" />
        </button>

        <button 
          type="button"
          onClick={fitAllBounds}
          className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-[#0D5BFF] hover:text-white dark:hover:bg-[#0D5BFF] dark:hover:text-white transition-all cursor-pointer border border-transparent hover:border-blue-200 dark:hover:border-transparent"
          title="Fit All in View"
        >
          <Focus className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>
    </>
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
  const [activeLayer, setActiveLayer] = useState<MapLayerPresetId>(theme === 'dark' ? 'dark' : 'streets');
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [routeDetails, setRouteDetails] = useState<{ distanceKm: string; durationMins: number } | null>(null);
  const [authPhotoEpoch, setAuthPhotoEpoch] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeAuthorizedPhotoCache(() => {
      setAuthPhotoEpoch((n) => n + 1);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const candidateUrls = [
      tutorImage,
      ...(Array.isArray(tutors) ? tutors.map((t) => t.image) : []),
    ];
    candidateUrls.forEach((url) => {
      if (url && isAuthorizedProxyPhotoUrl(url)) {
        const parsed = parseAuthorizedProxyPhotoUrl(url);
        if (parsed && !getCachedAuthorizedPhotoUrl(parsed.tutorId, parsed.version)) {
          fetchAuthorizedTutorPhoto(parsed.tutorId, parsed.version).catch(() => {});
        }
      }
    });
  }, [tutorImage, tutors]);

  const containerRef = useRef<HTMLDivElement>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const routingControlRef = useRef<any>(null);
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

  const activeStartLocation = tutorLocation || (selectedTutorObj ? selectedTutorObj.location : undefined);

  const center = useMemo<[number, number]>(() => {
    // 1. Live GPS of current logged in user
    if (currentUser?.location?.lat && currentUser?.location?.lng) {
      return [currentUser.location.lat, currentUser.location.lng];
    }
    // 2. Last known location stored in currentUser
    if (currentUser?.lastLocation?.lat && currentUser?.lastLocation?.lng) {
      return [currentUser.lastLocation.lat, currentUser.lastLocation.lng];
    }
    // 3. LocalStorage cached last GPS location
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('edutrack_last_gps_location');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.lat && parsed.lng) return [parsed.lat, parsed.lng];
        }
      } catch (e) {}
    }
    // 4. Props passed (studentLocation or tutorLocation)
    if (studentLocation) return studentLocation;
    if (tutorLocation) return tutorLocation;
    // 5. Surrounding markers
    if (tutors && tutors.length > 0) return tutors[0].location;
    if (students && students.length > 0) return students[0].location;
    // 6. Bangladesh / Dhaka default center
    return [23.8103, 90.4125];
  }, [currentUser?.location, currentUser?.lastLocation, tutorLocation, studentLocation, tutors, students]);

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
        }
      );
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

    const initialLayerConfig = MAP_LAYER_PRESETS[activeLayer];
    const tileLayer = L.tileLayer(initialLayerConfig.url, {
      attribution: initialLayerConfig.attribution,
      maxZoom: initialLayerConfig.maxZoom,
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

  // Update Tile Layer when preset changes
  useEffect(() => {
    if (!tileLayerRef.current) return;
    const config = MAP_LAYER_PRESETS[activeLayer];
    tileLayerRef.current.setUrl(config.url);
  }, [activeLayer]);

  // Sync with theme changes unless satellite view is explicitly active
  useEffect(() => {
    if (activeLayer !== 'satellite') {
      setActiveLayer(theme === 'dark' ? 'dark' : 'streets');
    }
  }, [theme]);

  // --------------------------------------------------------------------------
  // Real-Time Road Route Direction Engine (leaflet-routing-machine & OSRM)
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!mapInstance) return;

    // Remove existing routing control if present
    if (routingControlRef.current) {
      try {
        mapInstance.removeControl(routingControlRef.current);
      } catch (err) {}
      routingControlRef.current = null;
    }

    const start = activeStartLocation;
    const dest = studentLocation;

    if (!start || !dest) {
      setRouteDetails(null);
      return;
    }

    // Initialize leaflet-routing-machine with OSRM engine
    if ((L as any).Routing && (L as any).Routing.control) {
      try {
        const control = (L as any).Routing.control({
          waypoints: [
            L.latLng(start[0], start[1]),
            L.latLng(dest[0], dest[1]),
          ],
          routeWhileDragging: false,
          addWaypoints: false,
          draggableWaypoints: false,
          fitSelectedRoutes: true,
          show: false, // Hides default text instruction overlay box
          createMarker: () => null, // Suppresses default icons so custom circular DivIcons are displayed
          lineOptions: {
            styles: [
              {
                color: '#10b981', // Modern green/teal color
                opacity: 0.95,
                weight: 6,
                lineCap: 'round',
                lineJoin: 'round',
              },
            ],
            extendToWaypoints: true,
            missingRouteTolerance: 0,
          },
        }).addTo(mapInstance);

        routingControlRef.current = control;

        control.on('routesfound', (e: any) => {
          if (e.routes && e.routes[0]) {
            const summary = e.routes[0].summary;
            const distKm = (summary.totalDistance / 1000).toFixed(2);
            const durMin = Math.round(summary.totalTime / 60);
            setRouteDetails({
              distanceKm: distKm,
              durationMins: durMin > 0 ? durMin : 1,
            });
          }
        });
      } catch (err) {
        console.warn("Leaflet Routing Machine setup notice:", err);
      }
    }

    // Direct OSRM geometry fetch for ultra-reliable polyline fallback & smooth animation
    let isMounted = true;
    const fetchOSRMGeometry = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${dest[1]},${dest[0]}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        if (data.routes && data.routes[0] && isMounted && layerGroupRef.current) {
          const coords = data.routes[0].geometry.coordinates.map((c: [number, number]) => [c[1], c[0]] as [number, number]);
          const distKm = (data.routes[0].distance / 1000).toFixed(2);
          const durMin = Math.round(data.routes[0].duration / 60);

          setRouteDetails({
            distanceKm: distKm,
            durationMins: durMin > 0 ? durMin : 1,
          });

          // Draw custom green/teal road polyline
          if (layerGroupRef.current) {
            L.polyline(coords, {
              color: '#10b981', // Modern green/teal color
              weight: 6,
              opacity: 0.95,
              lineCap: 'round',
              lineJoin: 'round',
              className: 'animated-route-line',
            }).addTo(layerGroupRef.current);
          }
        }
      } catch (err) {
        console.warn("OSRM geometry fallback fetch warning:", err);
      }
    };

    fetchOSRMGeometry();

    return () => {
      isMounted = false;
      if (routingControlRef.current && mapInstance) {
        try {
          mapInstance.removeControl(routingControlRef.current);
        } catch (err) {}
        routingControlRef.current = null;
      }
    };
  }, [mapInstance, activeStartLocation?.[0], activeStartLocation?.[1], studentLocation?.[0], studentLocation?.[1]]);

  // Update Layers (Custom Circular Markers & Secondary Connection Polylines)
  useEffect(() => {
    if (!mapInstance || !layerGroupRef.current) return;

    const group = layerGroupRef.current;
    group.clearLayers();

    // 1. Connection Polylines for multiple student markers relative to single tutorLocation
    if (tutorLocation && students) {
      students.forEach(student => {
        L.polyline([tutorLocation, student.location], {
          color: '#10b981',
          weight: 4,
          opacity: 0.7,
          lineCap: 'round',
          className: 'animated-polyline'
        }).addTo(group);
      });
    }

    // 2. Connection Polylines for multiple tutor markers relative to single studentLocation
    if (studentLocation && tutors) {
      tutors.forEach(tutor => {
        L.polyline([studentLocation, tutor.location], {
          color: '#10b981',
          weight: 4,
          opacity: 0.7,
          lineCap: 'round',
          className: 'animated-polyline'
        }).addTo(group);
      });
    }

    // 3. Point A (Start / Tutor) Marker using Custom Circular DivIcon
    if (tutorLocation) {
      const isStartLive = true;
      const popupHtml = `
        <div style="padding: 10px; min-width: 140px;">
          <div style="font-size: 10px; font-weight: 900; text-transform: uppercase; font-style: italic; color: #10b981; margin-bottom: 4px;">
            📍 START (Tutor / Teacher)
          </div>
          <div style="font-size: 13px; font-weight: 900; color: #0B132B; margin-bottom: 6px;">
            ${tutorName || 'Tutor'}
          </div>
          ${routeDetails ? `
            <div style="display: flex; flex-direction: column; gap: 2px; margin-bottom: 8px; background: #ecfdf5; padding: 6px 10px; border-radius: 10px; border: 1px solid #a7f3d0;">
              <div style="font-size: 13px; font-weight: 900; font-style: italic; color: #047857;">
                🚗 ~${routeDetails.durationMins} MINS
              </div>
              <div style="font-size: 8px; font-weight: 800; color: #059669; text-transform: uppercase; letter-spacing: 0.05em;">
                Road Distance: ${routeDetails.distanceKm} KM
              </div>
            </div>
          ` : ''}
          <a href="https://www.google.com/maps/search/?api=1&query=${tutorLocation[0]},${tutorLocation[1]}"
             target="_blank" rel="noreferrer"
             style="margin-top: 6px; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 6px 12px; font-size: 8.5px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; color: #047857; background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; text-decoration: none;">
            Google Maps Directions
          </a>
        </div>
      `;

      L.marker(tutorLocation, { 
        icon: createCustomCircularMarker('start', tutorName || 'Tutor', tutorImage, isStartLive, 'START / TUTOR', false) 
      })
      .bindPopup(popupHtml)
      .addTo(group);
    }

    // 4. Point B (Destination / Student) Marker using Custom Circular DivIcon
    if (studentLocation) {
      const popupHtml = `
        <div style="padding: 10px; min-width: 140px;">
          <div style="font-size: 10px; font-weight: 900; text-transform: uppercase; font-style: italic; color: #0d9488; margin-bottom: 4px;">
            🎯 DESTINATION (Student)
          </div>
          <div style="font-size: 13px; font-weight: 900; color: #0B132B; margin-bottom: 6px;">
            ${studentName || 'Student'}
          </div>
          <a href="https://www.google.com/maps/search/?api=1&query=${studentLocation[0]},${studentLocation[1]}"
             target="_blank" rel="noreferrer"
             style="margin-top: 6px; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 6px 12px; font-size: 8.5px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; color: #0f766e; background-color: #f0fdfa; border: 1px solid #99f6e4; border-radius: 12px; text-decoration: none;">
            Google Maps Location
          </a>
        </div>
      `;

      L.marker(studentLocation, { 
        icon: createCustomCircularMarker('destination', studentName || 'Student', studentImage, true, 'DESTINATION', false) 
      })
      .bindPopup(popupHtml)
      .addTo(group);
    }

    // 5. Multiple tutors (using markerClusterGroup if available, or layerGroup)
    if (tutors && tutors.length > 0) {
      const clusterGroup = (L as any).markerClusterGroup ? (L as any).markerClusterGroup({
        showCoverageOnHover: false,
        maxClusterRadius: 40
      }) : L.layerGroup();

      tutors.forEach(tutor => {
        const isLive = tutor.isOnline !== false && !tutor.isLastKnownLocation;
        const lastSeenText = formatTimeAgo(tutor.lastLocationUpdatedAt || tutor.lastActiveAt);

        const subjectsHtml = tutor.subjects && tutor.subjects.length > 0 
          ? `<div style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px; max-width: 150px;">
              ${tutor.subjects.slice(0, 3).map(sub => `<span style="background-color: #ecfdf5; color: #047857; font-size: 7px; font-weight: 800; text-transform: uppercase; padding: 2px 4px; border-radius: 4px; border: 1px solid #a7f3d0;">${sub}</span>`).join('')}
             </div>`
          : '';

        const popupHtml = `
          <div style="padding: 10px; min-width: 150px;">
            <div style="font-size: 10px; font-weight: 900; text-transform: uppercase; font-style: italic; color: ${isLive ? '#10b981' : '#b45309'}; margin-bottom: 2px;">
              ${tutor.name} (${isLive ? 'Online Mentor' : 'Mentor'})
            </div>
            ${tutor.rating !== undefined ? `
              <div style="font-size: 9.5px; font-weight: 900; color: #f59e0b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">
                ⭐ ${tutor.rating > 0 ? tutor.rating.toFixed(1) : 'New'}
              </div>
            ` : ''}
            ${subjectsHtml}
            <div style="font-size: 8px; font-weight: 700; color: ${isLive ? '#059669' : '#64748b'}; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; display: flex; align-items: center; gap: 4px;">
              ${isLive ? '🟢 Live GPS Broadcasting' : `📍 Last Known Location (${lastSeenText})`}
            </div>
            ${studentLocation ? `
              <button type="button" data-tutor-id="${tutor.id}"
                style="margin-top: 6px; width: 100%; display: flex; align-items: center; justify-content: center; padding: 6px 12px; font-size: 8.5px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; border-radius: 12px; cursor: pointer; border: 1px solid ${selectedTutorId === tutor.id ? 'transparent' : '#a7f3d0'}; background-color: ${selectedTutorId === tutor.id ? '#10b981' : '#ecfdf5'}; color: ${selectedTutorId === tutor.id ? '#ffffff' : '#047857'};">
                ${selectedTutorId === tutor.id ? '📍 Active Route' : '🗺️ Draw Route'}
              </button>
            ` : ''}
          </div>
        `;

        const marker = L.marker(tutor.location, {
          icon: createCustomCircularMarker('tutor', tutor.name, tutor.image, tutor.isOnline, isLive ? 'LIVE TUTOR' : 'LAST LOCATION', tutor.isLastKnownLocation)
        }).bindPopup(popupHtml);

        clusterGroup.addLayer(marker);
      });

      group.addLayer(clusterGroup);
    }

    // 6. Multiple students
    if (students && students.length > 0) {
      students.forEach(student => {
        const isLive = student.isOnline !== false && !student.isLastKnownLocation;
        const lastSeenText = formatTimeAgo(student.lastLocationUpdatedAt || student.lastActiveAt);

        const popupHtml = `
          <div style="padding: 8px; min-width: 130px;">
            <div style="font-size: 10px; font-weight: 900; text-transform: uppercase; font-style: italic; color: ${isLive ? '#0d9488' : '#64748b'}; margin-bottom: 4px;">
              ${student.name} (Student)
            </div>
            <div style="font-size: 8px; font-weight: 700; color: ${isLive ? '#0d9488' : '#94a3b8'}; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">
              ${isLive ? '🟢 Active Now' : `📍 Last Known Location (${lastSeenText})`}
            </div>
          </div>
        `;

        L.marker(student.location, {
          icon: createCustomCircularMarker('student', student.name, student.image, student.isOnline, isLive ? 'STUDENT' : 'LAST LOCATION', student.isLastKnownLocation)
        }).bindPopup(popupHtml).addTo(group);
      });
    }

  }, [mapInstance, tutorLocation?.[0], tutorLocation?.[1], studentLocation?.[0], studentLocation?.[1], tutorName, studentName, tutorImage, studentImage, eta, JSON.stringify(tutors), JSON.stringify(students), selectedTutorId, selectedTutorObj, routeDetails, authPhotoEpoch]);

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
        activeLayer={activeLayer}
        onSelectLayer={setActiveLayer}
      />

      {/* Ride-Sharing / Delivery Tracking Route Overlay HUD Banner */}
      {activeStartLocation && studentLocation && (
        <div className="absolute top-14 sm:top-3 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2 sm:gap-2.5 bg-slate-950/90 dark:bg-slate-900/95 text-white backdrop-blur-md px-3.5 py-2 rounded-full shadow-2xl border border-emerald-500/40 animate-fade-in max-w-[92%] sm:max-w-md">
          <div className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </div>
          <div className="flex items-center gap-2 text-xs font-bold min-w-0">
            <span className="text-emerald-400 font-black uppercase tracking-wider text-[10px] shrink-0 flex items-center gap-1">
              <Route className="w-3 h-3" />
              Route Active
            </span>
            <div className="h-3 w-[1px] bg-slate-700" />
            {routeDetails ? (
              <div className="flex items-center gap-1.5 text-slate-200 text-[11px] truncate">
                <span>🚗 <strong className="text-emerald-300 font-extrabold">{routeDetails.durationMins} mins</strong></span>
                <span className="text-slate-400">({routeDetails.distanceKm} km)</span>
              </div>
            ) : (
              <span className="text-slate-400 text-[10px] italic">Drawing road path...</span>
            )}
          </div>
        </div>
      )}

      {/* Manual Pinning Instructions Overlay */}
      {isPinningMode && (
        <div className="absolute top-14 sm:top-4 left-3 sm:left-4 z-[1000] p-3.5 sm:p-4 bg-amber-500 text-white rounded-2xl shadow-xl border border-amber-400/50 font-sans max-w-[240px] sm:max-w-xs animate-fade-in">
          <p className="text-[10px] font-black uppercase tracking-[0.12em] mb-1 text-amber-100 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            CALIBRATING LOCATION
          </p>
          <p className="text-xs font-bold leading-normal text-white">
            Tap anywhere on the map to manually set your pin location.
          </p>
          <button 
            type="button"
            onClick={() => setIsPinningMode(false)}
            className="mt-2.5 px-3 min-h-[36px] py-1.5 bg-white hover:bg-slate-100 text-amber-700 font-black text-xs uppercase tracking-wider rounded-lg transition-all cursor-pointer shadow-sm active:scale-95 border-none"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Distance & Route Details Card Overlay */}
      {studentLocation && selectedTutorObj && (
        <div className="absolute top-28 sm:top-16 right-3 sm:right-4 z-[1000] max-w-[210px] sm:max-w-64 p-3 sm:p-3.5 bg-white/95 dark:bg-[#111A2E]/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/60 dark:border-slate-800/80 transition-all animate-fade-in">
          <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 italic mb-2">
            <Route className="w-3 h-3 stroke-[2.5]" />
            ACTIVE ROAD PATH
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <UserAvatar
                src={selectedTutorObj.image}
                name={selectedTutorObj.name}
                className="w-8 h-8 rounded-full border-2 border-emerald-500"
                fallbackClassName="bg-emerald-50 text-emerald-600"
                textClassName="font-black text-xs"
              />
              <div className="flex flex-col min-w-0 text-left">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-100 break-words leading-tight">
                  {selectedTutorObj.name}
                </div>
                {routeDetails ? (
                  <div className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wide leading-none mt-0.5">
                    {routeDetails.durationMins} mins ({routeDetails.distanceKm} km)
                  </div>
                ) : (
                  <div className="text-[8px] font-bold text-slate-400 italic mt-0.5">
                    Calculating route...
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setSelectedTutorId(null)}
                className="flex-1 py-1 px-2 text-[8px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer text-center border border-slate-200/40 dark:border-transparent"
              >
                Clear Route
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default MapTracker;
