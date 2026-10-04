const LOCATION_INDEX = [
  ['Minsk, Belarus', 53.9006, 27.5590], ['London, United Kingdom', 51.5074, -0.1278], ['New York, United States', 40.7128, -74.0060], ['San Francisco, United States', 37.7749, -122.4194], ['Austin, United States', 30.2672, -97.7431], ['Washington, United States', 38.9072, -77.0369], ['Toronto, Canada', 43.6532, -79.3832], ['Vancouver, Canada', 49.2827, -123.1207], ['Brisbane, Australia', -27.4698, 153.0251], ['Sydney, Australia', -33.8688, 151.2093], ['Melbourne, Australia', -37.8136, 144.9631], ['Canberra, Australia', -35.2809, 149.1300], ['Tokyo, Japan', 35.6762, 139.6503], ['Singapore', 1.3521, 103.8198], ['New Delhi, India', 28.6139, 77.2090], ['Berlin, Germany', 52.5200, 13.4050], ['Paris, France', 48.8566, 2.3522], ['Amsterdam, Netherlands', 52.3676, 4.9041], ['Oxford, United Kingdom', 51.7520, -1.2577], ['Cambridge, United Kingdom', 52.2053, 0.1218], ['Dublin, Ireland', 53.3498, -6.2603], ['Madrid, Spain', 40.4168, -3.7038], ['Rome, Italy', 41.9028, 12.4964], ['Zurich, Switzerland', 47.3769, 8.5417], ['São Paulo, Brazil', -23.5505, -46.6333], ['Mexico City, Mexico', 19.4326, -99.1332], ['Cape Town, South Africa', -33.9249, 18.4241], ['Dubai, United Arab Emirates', 25.2048, 55.2708], ['Seoul, South Korea', 37.5665, 126.9780]
];

export async function geocodeLocation(query) {
  const normalized = query.trim().toLowerCase();
  const match = LOCATION_INDEX.find(([label]) => label.toLowerCase().startsWith(normalized) || label.toLowerCase().includes(normalized));
  if (!match) throw new Error(`No local location found for “${query}”. Try a major city or capital.`);
  return { label: match[0], lat: match[1], lon: match[2] };
}
