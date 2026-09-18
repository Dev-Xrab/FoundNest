const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// expo-sqlite's web backend runs on wasm (OPFS) — Metro needs to know
// .wasm is an asset it can bundle.
config.resolver.assetExts.push('wasm');

// Metro's default sourceExts don't include 'mjs', so it refuses to resolve
// any package that ships ESM-only .mjs files (or cross-references between
// them) — maplibre-gl's pre-built dist bundle is exactly that.
config.resolver.sourceExts.push('mjs');

// The wasm build needs SharedArrayBuffer, which browsers only expose on a
// "cross-origin isolated" page — these headers turn that on for the local
// dev server. The same two headers must also be set by whichever static
// host serves the production build (see deployment notes).
config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    middleware(req, res, next);
  };
};

module.exports = config;
