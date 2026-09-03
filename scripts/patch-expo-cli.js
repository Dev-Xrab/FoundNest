/**
 * Run after npm install: node scripts/patch-expo-cli.js
 *
 * Expo CLI's `expo run:android` hardcodes `--configure-on-demand` for
 * `gradlew assemble*`. That flag makes Gradle configure only the
 * subprojects it thinks are needed, and on this project it causes it to
 * skip the codegen task for a few New Architecture native modules
 * (maplibre-react-native, react-native-view-shot, react-native-webview),
 * which then fails the native CMake configure step with errors like:
 *   "add_subdirectory given source ... which is not an existing directory"
 * Removing the flag fixes it (verified: a plain `gradlew assembleRelease`
 * without the flag builds successfully). There's no CLI flag to disable
 * it, so this patches the installed package directly. Re-applied on every
 * `npm install` via the "postinstall" script since node_modules isn't
 * committed to git.
 */
const fs = require('fs');
const path = require('path');

const TARGET = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo',
  'node_modules',
  '@expo',
  'cli',
  'build',
  'src',
  'start',
  'platforms',
  'android',
  'gradle.js',
);

if (!fs.existsSync(TARGET)) {
  console.warn(`patch-expo-cli: ${TARGET} not found, skipping (expo package layout may have changed).`);
  process.exit(0);
}

const original = fs.readFileSync(TARGET, 'utf8');
const patched = original
  .split(/\r?\n/)
  .filter((line) => line.trim() !== "'--configure-on-demand'" && line.trim() !== "'--configure-on-demand',")
  .join('\n');

if (patched === original) {
  console.log('patch-expo-cli: already patched (or flag not found), nothing to do.');
} else {
  fs.writeFileSync(TARGET, patched);
  console.log('patch-expo-cli: removed --configure-on-demand from expo-cli gradle assemble args.');
}
