/**
 * Run before git push: node scripts/check-secrets.js
 * Fails if common secret patterns appear in tracked source files.
 */
const { execSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const PATTERNS = [
  { name: 'Gemini API key (AIza...)', regex: /AIza[0-9A-Za-z_-]{20,}/ },
  { name: 'EXPO_PUBLIC_GEMINI', regex: /EXPO_PUBLIC_GEMINI/i },
  { name: 'GoogleGenAI client in app', regex: /from\s+["']@google\/genai["']/ },
  { name: 'Hardcoded apiKey', regex: /apiKey\s*:\s*["'][^"']+["']/ },
];

function listTrackedFiles() {
  const out = execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' });
  return out
    .split(/\r?\n/)
    .filter(Boolean)
    .filter(
      (f) =>
        !f.endsWith('.example') &&
        !f.includes('check-secrets') &&
        !f.endsWith('package-lock.json'),
    );
}

let failed = false;

for (const file of listTrackedFiles()) {
  const full = path.join(ROOT, file);
  let content;
  try {
    content = require('fs').readFileSync(full, 'utf8');
  } catch {
    continue;
  }

  for (const { name, regex } of PATTERNS) {
    if (regex.test(content)) {
      console.error(`FAIL: ${name} found in ${file}`);
      failed = true;
    }
  }
}

if (failed) {
  console.error(
    '\nRemove secrets before pushing. Gemini keys belong only on the server (Render).',
  );
  process.exit(1);
}

console.log('OK: No common Gemini/secret patterns in tracked files.');
