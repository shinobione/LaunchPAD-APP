import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const partsDirectory = 'cloudflare/admin-worker.parts';
const outputArgument = process.argv[2];
const outputPath = outputArgument
  ? path.resolve(outputArgument)
  : path.join(os.tmpdir(), 'launchpad-r2-admin-worker.js');

if (!fs.existsSync(partsDirectory)) {
  throw new Error(`Missing ${partsDirectory}.`);
}

const parts = fs.readdirSync(partsDirectory)
  .filter(filename => filename.endsWith('.part'))
  .sort((left, right) => left.localeCompare(right, 'en', { numeric: true }));

if (parts.length < 8) {
  throw new Error(`Expected at least 8 Track Manager source parts, received ${parts.length}.`);
}

const source = parts
  .map(filename => fs.readFileSync(path.join(partsDirectory, filename), 'utf8').replace(/[\r\n]+$/, ''))
  .join('');

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, source, 'utf8');

const syntax = spawnSync(process.execPath, ['--check', outputPath], {
  stdio: 'inherit'
});

if (syntax.status !== 0) {
  process.exit(syntax.status || 1);
}

const embeddedScript = source.match(/<script>([\s\S]*?)<\/script>/)?.[1];
if (!embeddedScript) {
  throw new Error('Built Track Manager Worker is missing its embedded UI script.');
}
try {
  new Function(embeddedScript);
} catch (error) {
  throw new Error(`Built Track Manager UI script has invalid syntax: ${error.message}`);
}

for (const required of [
  'version: "4.5"',
  'const ADMIN_HTML = String.raw`',
  'rel="icon" href="data:image/svg+xml',
  'class="form-section"',
  'justify-content:space-between',
  'document.querySelector',
  'aria-label="Actions du catalogue"',
  'function writeCatalogIndex(',
  'function parseTimestampedLyrics(',
  'timestampsAvailable'
]) {
  if (!source.includes(required)) {
    throw new Error(`Built Track Manager Worker is missing ${required}.`);
  }
}

console.log(`Built ${outputPath} from ${parts.length} source parts (${Buffer.byteLength(source)} bytes).`);

