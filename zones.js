// Greater Chennai Corporation zones with APPROXIMATE centre points.
// DEMO DATA ONLY: verify names and coordinates against official sources before
// making any claim about them. Nearest-centre matching is a simplification;
// real routing follows ward boundaries and road ownership.
const ZONES = [
  { id: 1,  name: 'Thiruvottiyur',     lat: 13.1590, lng: 80.3000 },
  { id: 2,  name: 'Manali',            lat: 13.1660, lng: 80.2630 },
  { id: 3,  name: 'Madhavaram',        lat: 13.1480, lng: 80.2310 },
  { id: 4,  name: 'Tondiarpet',        lat: 13.1260, lng: 80.2880 },
  { id: 5,  name: 'Royapuram',         lat: 13.1130, lng: 80.2950 },
  { id: 6,  name: 'Thiru Vi Ka Nagar', lat: 13.1080, lng: 80.2370 },
  { id: 7,  name: 'Ambattur',          lat: 13.1140, lng: 80.1550 },
  { id: 8,  name: 'Anna Nagar',        lat: 13.0850, lng: 80.2100 },
  { id: 9,  name: 'Teynampet',         lat: 13.0400, lng: 80.2500 },
  { id: 10, name: 'Kodambakkam',       lat: 13.0520, lng: 80.2250 },
  { id: 11, name: 'Valasaravakkam',    lat: 13.0400, lng: 80.1720 },
  { id: 12, name: 'Alandur',           lat: 13.0030, lng: 80.2010 },
  { id: 13, name: 'Adyar',             lat: 13.0060, lng: 80.2570 },
  { id: 14, name: 'Perungudi',         lat: 12.9650, lng: 80.2460 },
  { id: 15, name: 'Sholinganallur',    lat: 12.9010, lng: 80.2280 }
];
const MAX_ROUTE_KM = 40; // beyond this, no zone is assigned

function haversineKm(lat1, lng1, lat2, lng2) {
  const rad = d => d * Math.PI / 180;
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function nearestZone(lat, lng) {
  let best = null;
  for (const zone of ZONES) {
    const km = haversineKm(lat, lng, zone.lat, zone.lng);
    if (!best || km < best.km) best = { zone, km };
  }
  return best && best.km <= MAX_ROUTE_KM ? best : null;
}