import assert from 'node:assert/strict';
import fs from 'node:fs';

const files = [
  'js/features/visual/audio-lab-sanctuary.js',
  'js/features/visual/audio-lab-sanctuary-v2.js'
];

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');

  for (const required of [
    'function setTextIfChanged(',
    'if (element.textContent !== next) element.textContent = next;',
    'function setAttributeIfChanged(',
    'function orderPresetControls(',
    'if (alreadyOrdered) return false;',
    'let hasRelevantAddition = false;',
    'if (!hasRelevantAddition || scheduled) return;'
  ]) {
    assert.ok(source.includes(required), `${file} is missing the idempotence guard: ${required}`);
  }

  assert.ok(
    !/button\.textContent\s*=\s*(?:AUDIO_LAB_PRESET_LABELS|label|VIEW_LABELS)/.test(source),
    `${file} performs an unconditional button text rewrite that can retrigger MutationObserver.`
  );
  assert.ok(
    !source.includes('AUDIO_LAB_PRESET_IDS.forEach(mode =>'),
    `${file} unconditionally re-appends preset buttons and can create a render loop.`
  );
}

const recovery = fs.readFileSync('js/app-engine-recovery.js', 'utf8');
assert.ok(
  recovery.includes("import(versioned('./features/visual/audio-lab-sanctuary-v2.js'))"),
  'The recovery bootstrap must use the uncached sanctuary v2 path.'
);

console.log('Audio Lab sanctuary DOM normalization is idempotent and recovery-safe.');
