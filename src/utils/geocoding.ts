// Bangladesh regional geocoding coordinate reference
export const DISTRICT_COORDINATES: Record<string, [number, number]> = {
  "Dhaka": [23.8103, 90.4125],
  "Chattogram": [22.3569, 91.7832],
  "Sylhet": [24.8949, 91.8687],
  "Rajshahi": [24.3745, 88.6042],
  "Khulna": [22.8456, 89.5403],
  "Barishal": [22.7010, 90.3535],
  "Rangpur": [25.7439, 89.2752],
  "Mymensingh": [24.7471, 90.4203],
  "Cumilla": [23.4607, 91.1809],
  "Gazipur": [23.9999, 90.4203],
  "Narayanganj": [23.6238, 90.5000],
  "Bogura": [24.8481, 89.3730],
  "Cox's Bazar": [21.4272, 91.9701]
};

export const THANA_COORDINATES: Record<string, Record<string, [number, number]>> = {
  "Dhaka": {
    "Mirpur": [23.8069, 90.3687],
    "Uttara": [23.8759, 90.3795],
    "Dhanmondi": [23.7461, 90.3742],
    "Gulshan": [23.7925, 90.4078],
    "Banani": [23.7937, 90.4067],
    "Badda": [23.7805, 90.4267],
    "Motijheel": [23.7330, 90.4172],
    "Khilgaon": [23.7554, 90.4284],
    "Paltan": [23.7360, 90.4100],
    "Ramna": [23.7420, 90.4000],
    "Shahbagh": [23.7340, 90.3928],
    "Lalbagh": [23.7194, 90.3842],
    "Tejgaon": [23.7594, 90.3950],
    "Mohammadpur": [23.7658, 90.3580],
    "Savar": [23.8583, 90.2667],
    "Keraniganj": [23.6844, 90.3308],
    "Dhamrai": [23.9183, 90.2117]
  },
  "Chattogram": {
    "Akbar Shah": [22.3750, 91.7850],
    "Bakalia": [22.3420, 91.8480],
    "Bandar": [22.2965, 91.8030],
    "Bayazid Bostami": [22.3920, 91.8150],
    "Chandgaon": [22.3850, 91.8420],
    "Chawkbazar": [22.3580, 91.8380],
    "Kotwali": [22.3364, 91.8340],
    "Double Mooring": [22.3275, 91.8080],
    "EPZ": [22.2850, 91.7950],
    "Halishahar": [22.3256, 91.7820],
    "Khulshi": [22.3586, 91.8010],
    "Pahartali": [22.3620, 91.7750],
    "Panchlaish": [22.3686, 91.8210],
    "Patenga": [22.2530, 91.7950],
    "Sadarghat": [22.3280, 91.8250],
    "Karnaphuli": [22.3120, 91.8450],
    "Mirsharai": [22.7750, 91.5667],
    "Jorarganj": [22.8850, 91.5250],
    "Sitakunda": [22.6167, 91.6667],
    "Sandwip": [22.4833, 91.4333],
    "Hathazari": [22.5083, 91.8083],
    "Raozan": [22.5350, 91.9150],
    "Rangunia": [22.4720, 92.0350],
    "South Rangunia": [22.4120, 92.0520],
    "Boalkhali": [22.3750, 91.9250],
    "Patiya": [22.2983, 91.9772],
    "Anwara": [22.2150, 91.8950],
    "Chandanaish": [22.2180, 92.0420],
    "Satkania": [21.9420, 92.0750],
    "Lohagara": [21.8120, 92.0120],
    "Banshkhali": [21.9850, 91.9250],
    "Fatikchhari": [22.6850, 91.8250],
    "Bhujpur": [22.7850, 91.7950]
  },
  "Sylhet": {
    "Kotwali": [24.8949, 91.8687],
    "Shahporan": [24.9120, 91.9050],
    "South Surma": [24.8720, 91.8620],
    "Beanibazar": [24.8250, 92.1625],
    "Golapganj": [24.8583, 92.0250],
    "Jaintiapur": [25.1333, 92.1292]
  }
};

/**
 * Resolves precise coordinates for a given district and thana.
 * Supports jittering slightly to prevent exact overlaps when multiple profiles fall back to the same thana.
 */
export function getCoordinatesForLocation(
  district: string,
  thana?: string,
  userIdSeed?: string
): [number, number] {
  let coords: [number, number] = [23.8103, 90.4125]; // Default to Dhaka Center

  if (district && DISTRICT_COORDINATES[district]) {
    coords = [...DISTRICT_COORDINATES[district]];
  }

  if (district && thana && THANA_COORDINATES[district]?.[thana]) {
    coords = [...THANA_COORDINATES[district][thana]];
  }

  // If a seed is provided, add a deterministic slight jitter (up to ~200 meters)
  // to avoid overlapping markers perfectly.
  if (userIdSeed) {
    const charSum = userIdSeed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    // Jitter coordinates deterministically
    const latJitter = ((charSum % 40) - 20) / 15000;
    const lngJitter = (((charSum * 7) % 40) - 20) / 15000;
    coords[0] += latJitter;
    coords[1] += lngJitter;
  }

  return coords;
}

/**
 * Perform reverse geocoding on coordinates to obtain human-readable district and area.
 */
export async function reverseGeocodeLocation(lat: number, lng: number): Promise<{ district?: string; area?: string; address?: string } | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 sec timeout max

    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
      signal: controller.signal,
      headers: {
        'Accept-Language': 'en'
      }
    });
    clearTimeout(timeoutId);

    if (!res.ok) return null;
    const data = await res.json();
    if (!data || !data.address) return null;

    const address = data.address;
    const resolvedArea = address.suburb || address.neighbourhood || address.residential || address.quarter || address.village || address.city_district || '';
    const resolvedDistrict = address.state_district || address.district || address.county || address.city || address.state || '';

    return {
      area: resolvedArea,
      district: resolvedDistrict.replace(/ District/gi, '').replace(/ Division/gi, '').trim(),
      address: data.display_name
    };
  } catch (err) {
    return null;
  }
}

/**
 * Gets the current real-time position using High Accuracy GPS with fallback to standard accuracy.
 * Handles permissions, timeouts, and hardware absence gracefully and silently.
 */
export function getCurrentAccuratePosition(
  onSuccess: (pos: GeolocationPosition) => void,
  onError?: (err: GeolocationPositionError) => void,
  customOptions?: PositionOptions
) {
  if (typeof window === 'undefined' || !('navigator' in window) || !('geolocation' in navigator)) {
    if (onError) {
      onError({
        code: 2,
        message: 'Geolocation not supported',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3
      } as GeolocationPositionError);
    }
    return;
  }

  // 1st Attempt: High Accuracy GPS positioning
  navigator.geolocation.getCurrentPosition(
    (pos) => onSuccess(pos),
    (err) => {
      // If user explicitly denied permission, don't attempt standard fallback
      if (err.code === 1) {
        if (onError) onError(err);
        return;
      }

      // 2nd Attempt: Standard accuracy fallback for desktops/VMs without GPS hardware
      navigator.geolocation.getCurrentPosition(
        (pos2) => onSuccess(pos2),
        (err2) => {
          if (onError) onError(err2);
        },
        { enableHighAccuracy: false, timeout: 6000, maximumAge: 30000 }
      );
    },
    { enableHighAccuracy: true, timeout: 6000, maximumAge: 10000, ...customOptions }
  );
}

/**
 * Watches position continuously using GPS for real-time tracking.
 * Gracefully reports errors to callback without infinite retry storming.
 */
export function watchAccuratePosition(
  onSuccess: (pos: GeolocationPosition) => void,
  onError?: (err: GeolocationPositionError) => void
): number | null {
  if (typeof window === 'undefined' || !('navigator' in window) || !('geolocation' in navigator)) {
    return null;
  }

  try {
    return navigator.geolocation.watchPosition(
      (pos) => onSuccess(pos),
      (err) => {
        if (onError) {
          onError(err);
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
  } catch {
    return null;
  }
}
