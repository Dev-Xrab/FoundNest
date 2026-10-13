// Shared between native (MapScreen.jsx, via @maplibre/maplibre-react-native)
// and web (MapScreen.web.jsx, via Leaflet) so both render the same tiles.
export const GOOGLE_HYBRID_TILE_URL = "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}";

export const highDetailHybridStyle = {
  version: 8,
  sources: {
    "google-hybrid": {
      type: "raster",
      tiles: [GOOGLE_HYBRID_TILE_URL],
      tileSize: 256,
      maxzoom: 20,
    },
  },
  layers: [
    {
      id: "google-hybrid-layer",
      type: "raster",
      source: "google-hybrid",
      minzoom: 0,
      maxzoom: 20,
    },
  ],
};


// The map can't be panned beyond the BulSU main campus (+ a small margin).
// Same box as the web app's CAMPUS_BOUNDS.
const CAMPUS_SOUTH = 14.8535;
const CAMPUS_WEST = 120.8085;
const CAMPUS_NORTH = 14.863;
const CAMPUS_EAST = 120.82;

// MapLibre order: [west, south, east, north]
export const CAMPUS_BOUNDS_LNG_LAT = [
  CAMPUS_WEST,
  CAMPUS_SOUTH,
  CAMPUS_EAST,
  CAMPUS_NORTH,
];

// Leaflet order: [[south, west], [north, east]]
export const CAMPUS_BOUNDS_LAT_LNG = [
  [CAMPUS_SOUTH, CAMPUS_WEST],
  [CAMPUS_NORTH, CAMPUS_EAST],
];
