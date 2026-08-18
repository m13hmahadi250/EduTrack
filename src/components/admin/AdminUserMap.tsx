import React, { useState, useEffect, useMemo, useRef, memo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { User, useAppStore } from '../../store';
import { BANGLADESH_DISTRICTS, BANGLADESH_DIVISIONS, BANGLADESH_DIV_TO_DIST, BANGLADESH_THANAS } from '../../data/bangladeshData';
import { getCoordinatesForLocation } from '../../utils/geocoding';
import { formatJoinDate } from './AdminUserDirectory';
import {
  MapPin,
  Users,
  GraduationCap,
  Search,
  Filter,
  Layers,
  Compass,
  Crosshair,
  Maximize2,
  Minimize2,
  Phone,
  Mail,
  MessageSquare,
  CheckCircle2,
  Clock,
  Sparkles,
  BookOpen,
  School,
  Building2,
  ExternalLink,
  ShieldCheck,
  Eye,
  RefreshCw,
  SlidersHorizontal,
  Radio,
  Map as MapIcon,
  X,
  ChevronRight,
  ShieldAlert,
  Calendar,
  AlertCircle
} from 'lucide-react';

interface AdminUserMapProps {
  users: User[];
  onMessageUser?: (userId: string) => void;
  onSelectUser?: (user: User) => void;
}

// Map Tile Layer Presets
const MAP_LAYERS = {
  streets: {
    name: 'Clean Streets',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  voyager: {
    name: 'Carto Voyager',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 20,
  },
  dark: {
    name: 'Tactical Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 19,
  },
  satellite: {
    name: 'Satellite View',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 18,
  }
};

// Bangladesh Center default coordinates
const BANGLADESH_CENTER: [number, number] = [23.6850, 90.3563];

// Helper to create HTML DivIcon for Tutors and Students
function createAdminUserMarkerIcon(user: User, isSelected: boolean) {
  const isTutor = user.role === 'tutor';
  const themeColor = isTutor ? '#0D5BFF' : '#06B6D4'; // Blue for Tutor, Cyan for Student
  const badgeBg = isTutor ? '#0D5BFF' : '#0891B2';
  const roleLabel = isTutor ? 'TEACHER' : 'STUDENT';
  const isOnline = user.isOnline ?? false;
  const isVerified = user.isVerified || (user.nidStatus === 'approved' && user.academicStatus === 'approved');
  const hasGps = Boolean(user.location && user.location.lat && user.location.lng);

  const initial = (user.name || 'U').charAt(0).toUpperCase();
  const avatarHtml = user.profileImage
    ? `<img src="${user.profileImage}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" referrerpolicy="no-referrer" />`
    : `<div style="width: 100%; height: 100%; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 900; color: ${themeColor}; background: ${isTutor ? '#EFF6FF' : '#ECFEFF'};">${initial}</div>`;

  const selectedRing = isSelected ? `border: 3.5px solid #F59E0B; transform: scale(1.15); box-shadow: 0 0 20px rgba(245, 158, 11, 0.6);` : `border: 2.5px solid ${themeColor}; box-shadow: 0 8px 24px rgba(0,0,0,0.22);`;

  return L.divIcon({
    className: 'admin-geo-marker',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s ease;">
        <!-- Pulsing radar ring for online or selected user -->
        ${(isOnline || isSelected || hasGps) ? `
          <div style="position: absolute; width: 50px; height: 50px; border-radius: 50%; background-color: ${isSelected ? '#F59E0B' : themeColor}; opacity: 0.35; animation: custom-sonar 2s infinite ease-out; pointer-events: none; z-index: -1;"></div>
        ` : ''}
        
        <!-- Avatar Frame -->
        <div style="width: 38px; height: 38px; border-radius: 50%; background-color: #ffffff; ${selectedRing} display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative;">
          ${avatarHtml}
          ${isOnline ? `<div style="position: absolute; bottom: 1px; right: 1px; width: 9px; height: 9px; background-color: #10B981; border-radius: 50%; border: 1.5px solid white;"></div>` : ''}
        </div>

        <!-- Role Badge Tag -->
        <div style="margin-top: 3px; background-color: ${isSelected ? '#B45309' : badgeBg}; color: white; font-size: 7.5px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; padding: 2px 6px; border-radius: 9999px; box-shadow: 0 2px 6px rgba(0,0,0,0.25); white-space: nowrap; display: flex; align-items: center; gap: 3px;">
          ${isVerified ? '✓ ' : ''}${roleLabel}
        </div>
      </div>
    `,
    iconSize: [48, 58],
    iconAnchor: [24, 29],
    popupAnchor: [0, -30],
  });
}

export default function AdminUserMap({ users, onMessageUser, onSelectUser }: AdminUserMapProps) {
  // Filter States
  const [roleFilter, setRoleFilter] = useState<'all' | 'tutor' | 'student'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDivision, setSelectedDivision] = useState<string>('all');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [selectedThana, setSelectedThana] = useState<string>('all');
  const [onlineFilter, setOnlineFilter] = useState<'all' | 'online' | 'gps'>('all');
  const [verifiedFilter, setVerifiedFilter] = useState<'all' | 'verified' | 'pending'>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [activeLayer, setActiveLayer] = useState<keyof typeof MAP_LAYERS>('voyager');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);

  // Available districts based on division selection
  const availableDistricts = useMemo(() => {
    if (selectedDivision === 'all') return BANGLADESH_DISTRICTS;
    return BANGLADESH_DIV_TO_DIST[selectedDivision] || [];
  }, [selectedDivision]);

  // Available thanas based on district selection
  const availableThanas = useMemo(() => {
    if (selectedDistrict === 'all' || !BANGLADESH_THANAS[selectedDistrict]) return [];
    return BANGLADESH_THANAS[selectedDistrict];
  }, [selectedDistrict]);

  // All distinct subjects in user dataset
  const availableSubjects = useMemo(() => {
    const set = new Set<string>();
    users.forEach(u => {
      if (u.subjects && Array.isArray(u.subjects)) {
        u.subjects.forEach(s => s && set.add(s.trim()));
      }
      if (u.subject) set.add(u.subject.trim());
      if (u.course) set.add(u.course.trim());
    });
    return Array.from(set).sort();
  }, [users]);

  // Map each user to computed coordinates
  const mappedUsersWithCoords = useMemo(() => {
    return users.map((user) => {
      let coords: [number, number];
      let locationSource: 'gps' | 'last_gps' | 'thana' | 'district' | 'fallback' = 'fallback';

      if (user.location && user.location.lat && user.location.lng && !isNaN(user.location.lat) && !isNaN(user.location.lng)) {
        coords = [user.location.lat, user.location.lng];
        locationSource = 'gps';
      } else if (user.lastLocation && user.lastLocation.lat && user.lastLocation.lng && !isNaN(user.lastLocation.lat) && !isNaN(user.lastLocation.lng)) {
        coords = [user.lastLocation.lat, user.lastLocation.lng];
        locationSource = 'last_gps';
      } else {
        const district = user.district || 'Dhaka';
        const thana = user.thana || user.area;
        coords = getCoordinatesForLocation(district, thana, user.id);
        if (user.thana || user.area) {
          locationSource = 'thana';
        } else if (user.district) {
          locationSource = 'district';
        }
      }

      return {
        user,
        coords,
        locationSource,
      };
    });
  }, [users]);

  // Filtered dataset
  const filteredUsers = useMemo(() => {
    return mappedUsersWithCoords.filter(({ user }) => {
      // 1. Role Filter
      if (roleFilter !== 'all' && user.role !== roleFilter) return false;

      // 2. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = (user.name || '').toLowerCase().includes(query);
        const matchesEmail = (user.email || '').toLowerCase().includes(query);
        const matchesPhone = (user.phone || '').toLowerCase().includes(query);
        const matchesId = (user.id || '').toLowerCase().includes(query);
        const matchesUni = (user.university || '').toLowerCase().includes(query);
        const matchesSchool = (user.school || '').toLowerCase().includes(query);
        const matchesDistrict = (user.district || '').toLowerCase().includes(query);
        const matchesThana = (user.thana || user.area || '').toLowerCase().includes(query);
        const matchesAddress = (user.address || '').toLowerCase().includes(query);
        const matchesCourse = (user.course || '').toLowerCase().includes(query);
        const matchesSubj = (user.subjects || []).some(s => s.toLowerCase().includes(query));

        if (!matchesName && !matchesEmail && !matchesPhone && !matchesId && !matchesUni && !matchesSchool && !matchesDistrict && !matchesThana && !matchesAddress && !matchesCourse && !matchesSubj) {
          return false;
        }
      }

      // 3. Division Filter
      if (selectedDivision !== 'all') {
        const distsInDiv = BANGLADESH_DIV_TO_DIST[selectedDivision] || [];
        if (!user.district || !distsInDiv.includes(user.district)) {
          return false;
        }
      }

      // 4. District Filter
      if (selectedDistrict !== 'all') {
        if (user.district?.toLowerCase() !== selectedDistrict.toLowerCase()) {
          return false;
        }
      }

      // 5. Thana Filter
      if (selectedThana !== 'all') {
        const userThana = (user.thana || user.area || '').toLowerCase();
        if (!userThana.includes(selectedThana.toLowerCase())) {
          return false;
        }
      }

      // 6. Online / GPS Filter
      if (onlineFilter === 'online' && !user.isOnline) return false;
      if (onlineFilter === 'gps' && (!user.location || !user.location.lat)) return false;

      // 7. Verified Filter
      if (verifiedFilter === 'verified') {
        const isVer = user.isVerified || (user.nidStatus === 'approved' && user.academicStatus === 'approved');
        if (!isVer) return false;
      } else if (verifiedFilter === 'pending') {
        const isVer = user.isVerified || (user.nidStatus === 'approved' && user.academicStatus === 'approved');
        if (isVer) return false;
      }

      // 8. Subject Filter
      if (subjectFilter !== 'all') {
        const hasSubj = (user.subjects || []).some(s => s.toLowerCase() === subjectFilter.toLowerCase()) ||
          user.subject?.toLowerCase() === subjectFilter.toLowerCase() ||
          user.course?.toLowerCase() === subjectFilter.toLowerCase();
        if (!hasSubj) return false;
      }

      return true;
    });
  }, [
    mappedUsersWithCoords,
    roleFilter,
    searchQuery,
    selectedDivision,
    selectedDistrict,
    selectedThana,
    onlineFilter,
    verifiedFilter,
    subjectFilter,
  ]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const tutorsCount = filteredUsers.filter(u => u.user.role === 'tutor').length;
    const studentsCount = filteredUsers.filter(u => u.user.role === 'student').length;
    const onlineCount = filteredUsers.filter(u => u.user.isOnline).length;
    const gpsCount = filteredUsers.filter(u => u.locationSource === 'gps').length;
    const uniqueDistricts = new Set(filteredUsers.map(u => u.user.district).filter(Boolean)).size;

    return {
      total: filteredUsers.length,
      tutors: tutorsCount,
      students: studentsCount,
      online: onlineCount,
      gps: gpsCount,
      districts: uniqueDistricts
    };
  }, [filteredUsers]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: BANGLADESH_CENTER,
        zoom: 7,
        zoomControl: false,
        attributionControl: true,
      });

      // Add default tile layer
      const layerConfig = MAP_LAYERS[activeLayer];
      const tileLayer = L.tileLayer(layerConfig.url, {
        attribution: layerConfig.attribution,
        maxZoom: layerConfig.maxZoom,
      }).addTo(map);

      // Create LayerGroup for user markers
      const markersGroup = L.layerGroup().addTo(map);

      mapInstanceRef.current = map;
      tileLayerRef.current = tileLayer;
      markersGroupRef.current = markersGroup;

      // Invalidate size on load
      setTimeout(() => {
        map.invalidateSize();
      }, 250);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        tileLayerRef.current = null;
        markersGroupRef.current = null;
      }
    };
  }, []);

  // Update Tile Layer when layer changed
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }
    const layerConfig = MAP_LAYERS[activeLayer];
    const newTileLayer = L.tileLayer(layerConfig.url, {
      attribution: layerConfig.attribution,
      maxZoom: layerConfig.maxZoom,
    }).addTo(mapInstanceRef.current);
    tileLayerRef.current = newTileLayer;
  }, [activeLayer]);

  // Render Markers on Map
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = markersGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    const bounds = L.latLngBounds([]);

    filteredUsers.forEach(({ user, coords, locationSource }) => {
      const isSelected = selectedUser?.id === user.id;
      const icon = createAdminUserMarkerIcon(user, isSelected);

      const marker = L.marker(coords, { icon });

      // Build Rich HTML Popup
      const isTutor = user.role === 'tutor';
      const roleBadgeBg = isTutor ? '#0D5BFF' : '#0891B2';
      const joinInfo = formatJoinDate(user.createdAt);
      const isVerified = user.isVerified || (user.nidStatus === 'approved' && user.academicStatus === 'approved');

      const popupHtml = `
        <div style="font-family: system-ui, -apple-system, sans-serif; min-width: 220px; max-width: 280px; padding: 4px;">
          <div style="display: flex; items-center; gap: 10px; margin-bottom: 8px;">
            <div style="width: 44px; height: 44px; border-radius: 12px; overflow: hidden; background: #F1F5F9; border: 2px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.1); flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-weight: 900; color: ${roleBadgeBg};">
              ${user.profileImage ? `<img src="${user.profileImage}" style="width: 100%; height: 100%; object-fit: cover;" />` : (user.name || 'U').charAt(0)}
            </div>
            <div style="min-width: 0; flex: 1;">
              <div style="display: flex; align-items: center; gap: 4px; flex-wrap: wrap;">
                <span style="font-size: 13px; font-weight: 900; color: #0B132B; text-transform: uppercase;">${user.name || 'Unnamed User'}</span>
              </div>
              <span style="display: inline-block; background: ${roleBadgeBg}; color: white; font-size: 8px; font-weight: 900; text-transform: uppercase; padding: 1.5px 6px; border-radius: 4px; margin-top: 2px;">
                ${isTutor ? 'TEACHER / TUTOR' : 'STUDENT'} ${isVerified ? '✓' : ''}
              </span>
            </div>
          </div>

          <div style="font-size: 10px; color: #475569; line-height: 1.5; border-top: 1px solid #E2E8F0; padding-top: 6px; margin-top: 6px;">
            <div style="margin-bottom: 3px;">
              <strong>📍 Location:</strong> ${user.thana || user.area ? `${user.thana || user.area}, ` : ''}${user.district || 'Dhaka'}
              ${locationSource === 'gps' ? '<span style="color: #10B981; font-weight: bold; margin-left: 4px;">[Live GPS]</span>' : locationSource === 'last_gps' ? '<span style="color: #F59E0B; font-weight: bold; margin-left: 4px;">[Last Known GPS]</span>' : ''}
            </div>
            ${user.university ? `<div style="margin-bottom: 3px;"><strong>🎓 University:</strong> ${user.university}</div>` : ''}
            ${user.school ? `<div style="margin-bottom: 3px;"><strong>🏫 School:</strong> ${user.school}</div>` : ''}
            ${user.course ? `<div style="margin-bottom: 3px;"><strong>📚 Course:</strong> ${user.course}</div>` : ''}
            ${user.subjects && user.subjects.length > 0 ? `<div style="margin-bottom: 3px;"><strong>📖 Subjects:</strong> ${user.subjects.join(', ')}</div>` : ''}
            <div style="margin-bottom: 3px; font-family: monospace; font-size: 9px; color: #64748B;">
              <strong>📅 Joined:</strong> ${joinInfo.date} ${joinInfo.time || ''}
            </div>
          </div>

          <div style="display: flex; gap: 6px; margin-top: 8px; border-top: 1px solid #E2E8F0; padding-top: 8px;">
            <button 
              id="map-msg-btn-${user.id}" 
              style="flex: 1; padding: 6px 10px; background: #0D5BFF; color: white; border: none; border-radius: 8px; font-size: 9px; font-weight: 900; text-transform: uppercase; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;"
            >
              💬 Message
            </button>
            <button 
              id="map-inspect-btn-${user.id}" 
              style="flex: 1; padding: 6px 10px; background: #0B132B; color: white; border: none; border-radius: 8px; font-size: 9px; font-weight: 900; text-transform: uppercase; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;"
            >
              🔍 Inspect
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 300 });

      marker.on('popupopen', () => {
        // Wire up popup button click events
        setTimeout(() => {
          const msgBtn = document.getElementById(`map-msg-btn-${user.id}`);
          if (msgBtn && onMessageUser) {
            msgBtn.onclick = () => {
              onMessageUser(user.id);
            };
          }
          const inspectBtn = document.getElementById(`map-inspect-btn-${user.id}`);
          if (inspectBtn) {
            inspectBtn.onclick = () => {
              setSelectedUser(user);
              if (onSelectUser) onSelectUser(user);
            };
          }
        }, 50);
      });

      marker.on('click', () => {
        setSelectedUser(user);
      });

      marker.addTo(group);
      bounds.extend(coords);
    });

    // If we have markers and it's not a single manual user click, fit bounds
    if (filteredUsers.length > 0 && !selectedUser) {
      try {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      } catch (err) {
        // Ignore bounds error if empty
      }
    }
  }, [filteredUsers, selectedUser, onMessageUser, onSelectUser]);

  // Fly to user helper
  const handleFlyToUser = (user: User) => {
    setSelectedUser(user);
    const map = mapInstanceRef.current;
    if (!map) return;

    let coords: [number, number];
    if (user.location?.lat && user.location?.lng) {
      coords = [user.location.lat, user.location.lng];
    } else {
      coords = getCoordinatesForLocation(user.district || 'Dhaka', user.thana || user.area, user.id);
    }

    map.flyTo(coords, 15, { duration: 1.2 });

    // Open popup after fly animation
    setTimeout(() => {
      markersGroupRef.current?.eachLayer((layer: any) => {
        if (layer.getLatLng && layer.getLatLng().lat === coords[0] && layer.getLatLng().lng === coords[1]) {
          layer.openPopup();
        }
      });
    }, 1300);
  };

  // Reset View to whole country
  const handleResetCountryView = () => {
    setSelectedUser(null);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(BANGLADESH_CENTER, 7, { duration: 1 });
    }
  };

  // Fit all active filtered markers
  const handleFitAllMarkers = () => {
    if (!mapInstanceRef.current || filteredUsers.length === 0) return;
    const bounds = L.latLngBounds(filteredUsers.map(u => u.coords));
    mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  };

  // Reset Filters
  const handleClearFilters = () => {
    setRoleFilter('all');
    setSearchQuery('');
    setSelectedDivision('all');
    setSelectedDistrict('all');
    setSelectedThana('all');
    setOnlineFilter('all');
    setVerifiedFilter('all');
    setSubjectFilter('all');
    setSelectedUser(null);
    handleResetCountryView();
  };

  const hasActiveFilters = roleFilter !== 'all' || searchQuery !== '' || selectedDivision !== 'all' || selectedDistrict !== 'all' || selectedThana !== 'all' || onlineFilter !== 'all' || verifiedFilter !== 'all' || subjectFilter !== 'all';

  return (
    <div className={`space-y-6 ${isFullscreen ? 'fixed inset-0 z-[99999] bg-[#0B132B] p-4 lg:p-6 overflow-y-auto' : ''}`} id="admin-user-map-section">
      
      {/* Header & Live Intelligence Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0D5BFF] flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">Mapped Users</p>
            <h4 className="text-lg font-black text-[#0B132B]">{metrics.total}</h4>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0D5BFF] flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">Teachers</p>
            <h4 className="text-lg font-black text-[#0D5BFF]">{metrics.tutors}</h4>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
            <School className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">Students</p>
            <h4 className="text-lg font-black text-cyan-600">{metrics.students}</h4>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">Online Now</p>
            <h4 className="text-lg font-black text-emerald-600">{metrics.online}</h4>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Crosshair className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">Live GPS Pins</p>
            <h4 className="text-lg font-black text-purple-600">{metrics.gps}</h4>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">Districts</p>
            <h4 className="text-lg font-black text-amber-600">{metrics.districts} / 64</h4>
          </div>
        </div>
      </div>

      {/* Comprehensive Filter Control Deck */}
      <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-[#0B132B] italic flex items-center gap-2">
              <Compass className="w-4 h-4 text-[#0D5BFF]" />
              Geographic Intelligence & Location Filters
            </h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              Live Bangladesh GIS coordinates for all registered teachers and students
            </p>
          </div>

          {/* Quick Role Segmented Selector */}
          <div className="flex items-center bg-slate-100/90 p-1 rounded-2xl border border-slate-200/70 shadow-inner flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setRoleFilter('all')}
              className={`px-3.5 py-1.5 rounded-xl text-[8.5px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                roleFilter === 'all'
                  ? 'bg-[#0B132B] text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              All Users ({users.length})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter('tutor')}
              className={`px-3.5 py-1.5 rounded-xl text-[8.5px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                roleFilter === 'tutor'
                  ? 'bg-[#0D5BFF] text-white shadow-md shadow-blue-500/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <GraduationCap className="w-3 h-3" />
              <span>Teachers Only</span>
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter('student')}
              className={`px-3.5 py-1.5 rounded-xl text-[8.5px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                roleFilter === 'student'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <School className="w-3 h-3" />
              <span>Students Only</span>
            </button>
          </div>
        </div>

        {/* Search & Location Filter Dropdowns Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-3 border-t border-slate-100">
          {/* Universal Search */}
          <div className="relative sm:col-span-2">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search user, institution, phone, NID, subject..."
              className="w-full pl-9 pr-7 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-[10.5px] font-bold text-slate-800 placeholder-slate-400 outline-none focus:border-[#0D5BFF] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Division Selector */}
          <div>
            <select
              value={selectedDivision}
              onChange={(e) => {
                setSelectedDivision(e.target.value);
                setSelectedDistrict('all');
                setSelectedThana('all');
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-[10px] font-black uppercase text-slate-700 outline-none focus:border-[#0D5BFF] cursor-pointer"
            >
              <option value="all">ALL DIVISIONS</option>
              {BANGLADESH_DIVISIONS.map(div => (
                <option key={div} value={div}>{div} Division</option>
              ))}
            </select>
          </div>

          {/* District Selector */}
          <div>
            <select
              value={selectedDistrict}
              onChange={(e) => {
                setSelectedDistrict(e.target.value);
                setSelectedThana('all');
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-[10px] font-black uppercase text-slate-700 outline-none focus:border-[#0D5BFF] cursor-pointer"
            >
              <option value="all">ALL DISTRICTS</option>
              {availableDistricts.map(dist => (
                <option key={dist} value={dist}>{dist}</option>
              ))}
            </select>
          </div>

          {/* Thana / Area Selector */}
          <div>
            <select
              value={selectedThana}
              onChange={(e) => setSelectedThana(e.target.value)}
              disabled={availableThanas.length === 0}
              className={`w-full px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-[10px] font-black uppercase text-slate-700 outline-none focus:border-[#0D5BFF] cursor-pointer ${
                availableThanas.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <option value="all">{availableThanas.length === 0 ? 'SELECT DISTRICT FIRST' : 'ALL THANAS'}</option>
              {availableThanas.map(thana => (
                <option key={thana} value={thana}>{thana}</option>
              ))}
            </select>
          </div>

          {/* Subject Filter */}
          <div>
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-[10px] font-black uppercase text-slate-700 outline-none focus:border-[#0D5BFF] cursor-pointer"
            >
              <option value="all">ALL SUBJECTS</option>
              {availableSubjects.map(subj => (
                <option key={subj} value={subj}>{subj}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Secondary Filter Chips Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[8.5px]">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-black uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3 text-[#0D5BFF]" /> Status:
            </span>

            {/* Online Status Pills */}
            <button
              onClick={() => setOnlineFilter(onlineFilter === 'online' ? 'all' : 'online')}
              className={`px-2.5 py-1 rounded-lg font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
                onlineFilter === 'online'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Online Only ({metrics.online})
            </button>

            <button
              onClick={() => setOnlineFilter(onlineFilter === 'gps' ? 'all' : 'gps')}
              className={`px-2.5 py-1 rounded-lg font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
                onlineFilter === 'gps'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
              }`}
            >
              <Crosshair className="w-2.5 h-2.5" />
              Live GPS Fixed ({metrics.gps})
            </button>

            {/* Verification Status Pills */}
            <button
              onClick={() => setVerifiedFilter(verifiedFilter === 'verified' ? 'all' : 'verified')}
              className={`px-2.5 py-1 rounded-lg font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
                verifiedFilter === 'verified'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              <ShieldCheck className="w-2.5 h-2.5" />
              Verified Only
            </button>
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="px-3 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3 h-3" />
              Reset All Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Map + Side User Feed Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Map Canvas Container */}
        <div className={`lg:col-span-8 bg-white rounded-[2.5rem] p-3 sm:p-4 border border-slate-100 shadow-sm relative overflow-hidden flex flex-col ${isFullscreen ? 'h-[85vh]' : 'h-[620px]'}`}>
          
          {/* Floating Map HUD Layer Controls (Bottom Left) */}
          <div className="absolute bottom-6 left-6 z-[1000] flex items-center gap-1.5 bg-white/95 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/80 shadow-xl">
            <button
              type="button"
              onClick={() => setActiveLayer('voyager')}
              className={`px-3 py-1.5 rounded-xl text-[8.5px] sm:text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeLayer === 'voyager' ? 'bg-[#0D5BFF] text-white shadow-sm ring-1 ring-blue-500/40' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Clean Streets
            </button>
            <button
              type="button"
              onClick={() => setActiveLayer('dark')}
              className={`px-3 py-1.5 rounded-xl text-[8.5px] sm:text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeLayer === 'dark' ? 'bg-[#0B132B] text-white shadow-sm border border-slate-700/60 ring-1 ring-slate-700/40' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Tactical Dark
            </button>
            <button
              type="button"
              onClick={() => setActiveLayer('satellite')}
              className={`px-3 py-1.5 rounded-xl text-[8.5px] sm:text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeLayer === 'satellite' ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-500/40' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Satellite
            </button>
          </div>

          {/* Floating Map Action Tools (Right Corner) */}
          <div className="absolute top-6 right-6 z-[1000] flex flex-col gap-1.5">
            <button
              type="button"
              onClick={handleFitAllMarkers}
              title="Fit all markers in view"
              className="p-2.5 bg-white/95 hover:bg-white text-slate-700 hover:text-[#0D5BFF] rounded-xl border border-slate-200/80 shadow-lg transition-all active:scale-95 cursor-pointer backdrop-blur-md"
            >
              <Compass className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleResetCountryView}
              title="Center Whole Bangladesh"
              className="p-2.5 bg-white/95 hover:bg-white text-slate-700 hover:text-[#0D5BFF] rounded-xl border border-slate-200/80 shadow-lg transition-all active:scale-95 cursor-pointer backdrop-blur-md"
            >
              <MapIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Map'}
              className="p-2.5 bg-white/95 hover:bg-white text-slate-700 hover:text-[#0D5BFF] rounded-xl border border-slate-200/80 shadow-lg transition-all active:scale-95 cursor-pointer backdrop-blur-md"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>

          {/* Leaflet Map Root */}
          <div 
            ref={mapContainerRef} 
            className="w-full h-full rounded-[2rem] overflow-hidden z-10"
            style={{ minHeight: '100%' }}
          />

          {/* Selected User Floating Bottom Pill */}
          {selectedUser && (
            <div className="absolute bottom-6 left-6 right-6 z-[1000] bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200/90 shadow-2xl flex items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-3 duration-200">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-slate-700 overflow-hidden shrink-0">
                  {selectedUser.profileImage ? (
                    <img src={selectedUser.profileImage} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (selectedUser.name || 'U').charAt(0)
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h5 className="text-xs font-black text-[#0B132B] uppercase truncate">{selectedUser.name}</h5>
                    <span className={`text-[7.5px] font-black uppercase px-2 py-0.5 rounded ${
                      selectedUser.role === 'tutor' ? 'bg-blue-100 text-[#0D5BFF]' : 'bg-cyan-100 text-cyan-700'
                    }`}>
                      {selectedUser.role === 'tutor' ? 'Teacher' : 'Student'}
                    </span>
                  </div>
                  <p className="text-[9px] font-bold text-slate-500 truncate">
                    📍 {selectedUser.thana ? `${selectedUser.thana}, ` : ''}{selectedUser.district || 'Dhaka'} • {selectedUser.university || selectedUser.school || selectedUser.course || 'Independent'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {onMessageUser && (
                  <button
                    onClick={() => onMessageUser(selectedUser.id)}
                    className="px-3 py-1.5 bg-[#0D5BFF] hover:bg-blue-600 text-white rounded-xl text-[8.5px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>Message</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedUser(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 text-xs font-bold"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Side Panel: Filtered User Roster & Fly-to Controller */}
        <div className="lg:col-span-4 bg-white rounded-[2.5rem] p-5 border border-slate-100 shadow-sm flex flex-col h-[620px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-[#0B132B] flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#0D5BFF]" />
                Location Stream ({filteredUsers.length})
              </h4>
              <p className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider">
                Click any user to fly to their location pin
              </p>
            </div>
          </div>

          {/* Scrollable User Stream List */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pt-3 pr-1">
            {filteredUsers.map(({ user, locationSource }) => {
              const isSelected = selectedUser?.id === user.id;
              const isTutor = user.role === 'tutor';
              const joinInfo = formatJoinDate(user.createdAt);

              return (
                <div
                  key={user.id}
                  onClick={() => handleFlyToUser(user)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-blue-50/80 border-[#0D5BFF] shadow-md scale-[1.01]'
                      : 'bg-slate-50/60 border-slate-100 hover:bg-white hover:border-slate-200 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-black text-slate-700 overflow-hidden shadow-xs">
                        {user.profileImage ? (
                          <img src={user.profileImage} alt="" className="w-full h-full object-cover" />
                        ) : (
                          (user.name || 'U').charAt(0)
                        )}
                      </div>
                      {user.isOnline && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h5 className="text-[11px] font-black text-[#0B132B] uppercase truncate leading-tight">
                          {user.name}
                        </h5>
                        {user.isVerified && (
                          <span className="text-blue-600 text-[9px]" title="Verified">✓</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[7.5px] font-black uppercase px-1.5 py-0.5 rounded font-mono ${
                          isTutor ? 'bg-blue-100 text-[#0D5BFF]' : 'bg-cyan-100 text-cyan-800'
                        }`}>
                          {isTutor ? 'Teacher' : 'Student'}
                        </span>
                        <span className="text-[8.5px] font-bold text-slate-500 truncate">
                          📍 {user.thana || user.area ? `${user.thana || user.area}, ` : ''}{user.district || 'Dhaka'}
                        </span>
                      </div>

                      <p className="text-[8px] font-medium text-slate-400 truncate mt-0.5">
                        {user.university || user.school || user.course || 'General'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[8px] font-mono text-slate-400">
                      {joinInfo.date}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFlyToUser(user);
                      }}
                      className="px-2 py-1 bg-white hover:bg-[#0D5BFF] text-slate-600 hover:text-white rounded-lg border border-slate-200/80 text-[7.5px] font-black uppercase tracking-wider transition-all flex items-center gap-1"
                    >
                      <Crosshair className="w-2.5 h-2.5" />
                      Locate
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredUsers.length === 0 && (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100">
                <AlertCircle className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                <p className="text-[11px] font-black text-slate-700 uppercase">No users matched</p>
                <p className="text-[9px] text-slate-400 mt-0.5">Try clearing filters or search query.</p>
                <button
                  onClick={handleClearFilters}
                  className="mt-3 px-3 py-1.5 bg-[#0D5BFF] text-white rounded-xl text-[8px] font-black uppercase"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
