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

// Custom Circular HTML DivIcon Generator for Ride-Sharing / Delivery Tracking UI
const createCustomCircularMarker = (
  type: 'start' | 'destination' | 'tutor' | 'student',
  name: string,
  image?: string,
  isOnline?: boolean,
  roleLabel?: string
) => {
  const isStart = type === 'start' || type === 'tutor';
  const themeColor = isStart ? '#10b981' : '#2dd4bf'; // Emerald Green for Start, Teal for Destination
  const themeBg = isStart ? '#ecfdf5' : '#f0fdfa';
  const badgeText = roleLabel || (isStart ? 'START' : 'DESTINATION');
  const badgeBg = isStart ? '#10b981' : '#0d9488';

  const avatarContent = image 
    ? `<img src="${image}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" referrerpolicy="no-referrer" />`
    : `<div style="width: 100%; height: 100%; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 900; color: ${themeColor}; background: ${themeBg};">
        ${name.charAt(0).toUpperCase()}
      </div>`;

  return L.divIcon({
    className: 'custom-circular-marker',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center;">
        <!-- Pulsing Aura Ring -->
        <div style="position: absolute; width: 48px; height: 48px; border-radius: 50%; background-color: ${themeColor}; opacity: 0.35; animation: custom-sonar 2s infinite ease-out; pointer-events: none; z-index: -1;"></div>
        
        <!-- Circular Avatar Frame -->
        <div style="width: 40px; height: 40px; border-radius: 50%; background-color: #ffffff; border: 3px solid ${themeColor}; box-shadow: 0 10px 25px -3px rgba(0,0,0,0.3), 0 4px 10px -2px rgba(0,0,0,0.15); display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative;">
          ${avatarContent}
          ${isOnline !== false ? `<div style="position: absolute; bottom: 1px; right: 1px; width: 9px; height: 9px; background-color: #10b981; border-radius: 50%; border: 1.5px solid white;"></div>` : ''}
        </div>

        <!-- Role Badge Tag -->
        <div style="margin-top: 3px; background-color: ${badgeBg}; color: white; font-size: 7.5px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; padding: 2px 6px; border-radius: 9999px; box-shadow: 0 2px 6px rgba(0,0,0,0.25); white-space: nowrap;">
          ${badgeText}
        </div>
      </div>
    `,
    iconSize: [48, 60],
    iconAnchor: [24, 30],
    popupAnchor: [0, -32]
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
  const { currentUser, updateLocation } = useAppStore();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncGPS = () => {
    if (!currentUser?.id) return;
    setIsSyncing(true);
    getCurrentAccuratePosition(
      (pos) => {
        updateLocation(currentUser.id, pos.coords.latitude, pos.coords.longitude);
        setIsSyncing(false);
        if (map) {
          map.setView([pos.coords.latitude, pos.coords.longitude], 15);
        }
      },
      (err) => {
        console.warn("GPS sync error:", err);
        setIsSyncing(false);
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
      {hasUser && (
        <div className="absolute top-3 left-3 z-[1000] flex items-center gap-2 bg-white/95 dark:bg-[#111A2E]/95 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg border border-slate-200/60 dark:border-slate-800/80">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-[10px] font-bold tracking-wider text-slate-700 dark:text-slate-200 uppercase">
            Device GPS Live
          </span>
          <button
            type="button"
            onClick={handleSyncGPS}
            disabled={isSyncing}
            className="ml-1 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-emerald-600 transition-colors cursor-pointer"
            title="Sync Device GPS Location Now"
          >
            <Crosshair className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-500' : ''}`} />
          </button>
        </div>
      )}

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
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [routeDetails, setRouteDetails] = useState<{ distanceKm: string; durationMins: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const roadLayerGroupRef = useRef<L.LayerGroup | null>(null);
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

    const roadLayerGroup = L.layerGroup().addTo(map);
    const layerGroup = L.layerGroup().addTo(map);
    roadLayerGroupRef.current = roadLayerGroup;
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
      roadLayerGroupRef.current = null;
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

  // --------------------------------------------------------------------------
  // Real-Time Road Route Direction Engine (leaflet-routing-machine & OSRM)
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!mapInstance) return;

    // Clear existing road layers
    if (roadLayerGroupRef.current) {
      roadLayerGroupRef.current.clearLayers();
    }

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

    let isMounted = true;

    // Direct OSRM geometry fetch for 100% accurate road driving path polyline
    const fetchOSRMGeometry = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${dest[1]},${dest[0]}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        
        if (data.routes && data.routes[0] && isMounted && roadLayerGroupRef.current) {
          const coords = data.routes[0].geometry.coordinates.map(
            (c: [number, number]) => [c[1], c[0]] as [number, number]
          );
          const distKm = (data.routes[0].distance / 1000).toFixed(2);
          const durMin = Math.round(data.routes[0].duration / 60);

          setRouteDetails({
            distanceKm: distKm,
            durationMins: durMin > 0 ? durMin : 1,
          });

          // Clear previous road polylines before adding the new road path
          roadLayerGroupRef.current.clearLayers();

          // Draw custom green/teal polyline strictly following actual roads
          const roadPolyline = L.polyline(coords, {
            color: '#10b981', // Modern emerald/teal green
            weight: 6,
            opacity: 0.95,
            lineCap: 'round',
            lineJoin: 'round',
            className: 'animated-route-line',
          }).addTo(roadLayerGroupRef.current);

          // Fit map bounds to show the entire road route clearly
          try {
            mapInstance.fitBounds(roadPolyline.getBounds().pad(0.15));
          } catch (err) {}
        }
      } catch (err) {
        console.warn("OSRM geometry fetch warning:", err);
      }
    };

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
          if (e.routes && e.routes[0] && isMounted) {
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

  // Update Layers (Custom Circular Markers)
  useEffect(() => {
    if (!mapInstance || !layerGroupRef.current) return;

    const group = layerGroupRef.current;
    group.clearLayers();

    // 1. Point A (Start / Tutor) Marker using Custom Circular DivIcon
    if (tutorLocation) {
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
        icon: createCustomCircularMarker('start', tutorName || 'Tutor', tutorImage, true, 'START / TUTOR') 
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
        icon: createCustomCircularMarker('destination', studentName || 'Student', studentImage, true, 'DESTINATION') 
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
        const subjectsHtml = tutor.subjects && tutor.subjects.length > 0 
          ? `<div style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px; max-width: 150px;">
              ${tutor.subjects.slice(0, 3).map(sub => `<span style="background-color: #ecfdf5; color: #047857; font-size: 7px; font-weight: 800; text-transform: uppercase; padding: 2px 4px; border-radius: 4px; border: 1px solid #a7f3d0;">${sub}</span>`).join('')}
             </div>`
          : '';

        const popupHtml = `
          <div style="padding: 10px; min-width: 140px;">
            <div style="font-size: 10px; font-weight: 900; text-transform: uppercase; font-style: italic; color: #10b981; margin-bottom: 2px;">
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
            ${studentLocation ? `
              <button type="button" data-tutor-id="${tutor.id}"
                style="margin-top: 6px; width: 100%; display: flex; align-items: center; justify-content: center; padding: 6px 12px; font-size: 8.5px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; border-radius: 12px; cursor: pointer; border: 1px solid ${selectedTutorId === tutor.id ? 'transparent' : '#a7f3d0'}; background-color: ${selectedTutorId === tutor.id ? '#10b981' : '#ecfdf5'}; color: ${selectedTutorId === tutor.id ? '#ffffff' : '#047857'};">
                ${selectedTutorId === tutor.id ? '📍 Active Route' : '🗺️ Draw Route'}
              </button>
            ` : ''}
          </div>
        `;

        const marker = L.marker(tutor.location, {
          icon: createCustomCircularMarker('tutor', tutor.name, tutor.image, tutor.isOnline, 'TUTOR')
        }).bindPopup(popupHtml);

        clusterGroup.addLayer(marker);
      });

      group.addLayer(clusterGroup);
    }

    // 6. Multiple students
    if (students && students.length > 0) {
      students.forEach(student => {
        const popupHtml = `
          <div style="padding: 8px; min-width: 120px;">
            <div style="font-size: 10px; font-weight: 900; text-transform: uppercase; font-style: italic; color: #0d9488; margin-bottom: 4px;">
              ${student.name} (Student)
            </div>
            <div style="font-size: 8px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">
              Status: ${student.isOnline ? 'Online' : 'Offline'}
            </div>
          </div>
        `;

        L.marker(student.location, {
          icon: createCustomCircularMarker('student', student.name, student.image, student.isOnline, 'STUDENT')
        }).bindPopup(popupHtml).addTo(group);
      });
    }

  }, [mapInstance, tutorLocation?.[0], tutorLocation?.[1], studentLocation?.[0], studentLocation?.[1], tutorName, studentName, tutorImage, studentImage, eta, JSON.stringify(tutors), JSON.stringify(students), selectedTutorId, selectedTutorObj, routeDetails]);

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

      {/* Ride-Sharing / Delivery Tracking Route Overlay HUD Banner */}
      {activeStartLocation && studentLocation && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2.5 bg-slate-950/90 dark:bg-slate-900/95 text-white backdrop-blur-md px-4 py-2 rounded-full shadow-2xl border border-emerald-500/40 animate-fade-in max-w-[92%] sm:max-w-md">
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

      {/* Distance & Route Details Card Overlay */}
      {studentLocation && selectedTutorObj && (
        <div className="absolute top-16 right-4 z-[1000] max-w-[220px] sm:max-w-64 p-3 sm:p-3.5 bg-white/95 dark:bg-[#111A2E]/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/60 dark:border-slate-800/80 transition-all animate-fade-in">
          <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 italic mb-2">
            <Route className="w-3 h-3 stroke-[2.5]" />
            ACTIVE ROAD PATH
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {selectedTutorObj.image ? (
                <img src={selectedTutorObj.image} referrerPolicy="no-referrer" className="w-8 h-8 rounded-full object-cover border-2 border-emerald-500" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-xs border-2 border-emerald-500">
                  {selectedTutorObj.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex flex-col min-w-0 text-left">
                <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate leading-tight">
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
