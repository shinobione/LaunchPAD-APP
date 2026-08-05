import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('cloudflare/admin-worker.parts/13-duration-format.inject.part', 'utf8');
const duration = { pattern: '', title: '' };
const form = { elements: { duration } };
const context = vm.createContext({
  $: selector => selector === '#trackForm' ? form : null,
});

vm.runInContext(source, context);

assert.equal(duration.pattern, '(?:[0-9]+:)?[0-5][0-9](?:\\.[0-9]{1,3})?');
const durationPattern = new RegExp(`^(?:${duration.pattern})$`);
for (const valid of ['03:09', '03:09.64', '3:09.640', '00:00.1']) {
  assert.equal(durationPattern.test(valid), true, `${valid} must be accepted`);
}
for (const invalid of ['03:69', '03:09x64', '3:9', '03:09.1234']) {
  assert.equal(durationPattern.test(invalid), false, `${invalid} must be rejected`);
}
assert.match(duration.title, /mm:ss\.xx/);

console.log('Track Manager accepts whole-second and fractional mm:ss durations.');
