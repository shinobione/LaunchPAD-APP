import assert from 'node:assert/strict';
import fs from 'node:fs';

export function readActiveBuildMetadata(path = 'js/build-config.js') {
  const source = fs.readFileSync(path, 'utf8');
  const block = source.match(/const config = Object\.freeze\(\{([\s\S]*?)\n\s*\}\);/)?.[1];
  assert.ok(block, `Active build config block is missing in ${path}.`);

  const value = field => block.match(new RegExp(`${field}:\\s*'([^']+)'`))?.[1] || '';
  const metadata = {
    id: value('id'),
    cache: value('cache'),
    revision: value('revision'),
    display: value('display'),
    release: value('release')
  };

  for (const [field, current] of Object.entries(metadata)) {
    assert.ok(current, `Active build metadata is missing ${field}.`);
  }

  assert.match(metadata.id, /^\d{8}-[a-z0-9][a-z0-9-]*$/i, 'Build id must be date-prefixed and stable.');
  assert.match(metadata.cache, /^shinobi-launchpad-v(\d+)$/, 'Build cache must use shinobi-launchpad-vN.');
  assert.match(metadata.display, /^\d{4}\.\d{2}\.\d{2}\.(\d+)$/, 'Build display must use YYYY.MM.DD.N.');
  assert.match(metadata.release, /^[a-z0-9][a-z0-9-]*$/i, 'Build release must be a stable slug.');

  const cacheNumber = Number(metadata.cache.match(/v(\d+)$/)?.[1]);
  const displayNumber = Number(metadata.display.match(/\.(\d+)$/)?.[1]);
  assert.equal(cacheNumber, displayNumber, 'Cache namespace and display build number must agree.');

  return { ...metadata, number: displayNumber, source };
}

export function assertCurrentBuild(label = 'Runtime') {
  const build = readActiveBuildMetadata();
  assert.ok(build.number > 0, `${label} requires a positive active build number.`);
  return build;
}
