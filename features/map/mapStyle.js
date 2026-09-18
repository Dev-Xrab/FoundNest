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
