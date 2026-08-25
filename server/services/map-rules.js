export const mapFeatureTypes = ['INFRASTRUCTURE', 'ROAD', 'GATE', 'CAMERA', 'LIGHTING', 'PLAYGROUND', 'UTILITY', 'OTHER'];

export function validCoordinates(latitude, longitude) {
  if (latitude === '' || longitude === '' || latitude == null || longitude == null) return false;
  return Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude)) && Number(latitude) >= -90 && Number(latitude) <= 90 && Number(longitude) >= -180 && Number(longitude) <= 180;
}

export function mapBounds(points) {
  const located = points.filter(point => validCoordinates(point.latitude, point.longitude));
  if (!located.length) return null;
  const latitudes = located.map(point => Number(point.latitude));
  const longitudes = located.map(point => Number(point.longitude));
  const padding = 0.0005;
  return { north: Math.max(...latitudes) + padding, south: Math.min(...latitudes) - padding, east: Math.max(...longitudes) + padding, west: Math.min(...longitudes) - padding };
}
