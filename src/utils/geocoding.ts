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
    "Double Mooring": [22.3275, 91.8080],
    "Halishahar": [22.3256, 91.7820],
    "Panchlaish": [22.3686, 91.8210],
    "Bandar": [22.2965, 91.8030],
    "Kotwali": [22.3364, 91.8340],
    "Khulshi": [22.3586, 91.8010],
    "Patenga": [22.2530, 91.7950],
    "Bakalia": [22.3420, 91.8480],
    "Hathazari": [22.5083, 91.8083],
    "Sitakunda": [22.6167, 91.6667],
    "Mirsharai": [22.7750, 91.5667],
    "Patiya": [22.2983, 91.9772],
    "Sandwip": [22.4833, 91.4333]
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
