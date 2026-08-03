import { createQueueController } from '../js/core/player-queue.js';

const queue = createQueueController({ allIndexes: [0, 1, 2, 3, 4, 5] });
queue.setContext([1, 3, 5], 1, { type: 'favorites', id: 'local' });
if (queue.next() !== 3 || queue.next() !== 5 || queue.next() !== null) {
  throw new Error('Favorites must play continuously and stop at the end when repeat is off.');
}

const repeatQueue = createQueueController({ allIndexes: [0, 1, 2, 3] });
repeatQueue.setContext([1, 3], 3, { type: 'favorites', id: 'local' });
repeatQueue.cycleRepeat();
if (repeatQueue.next() !== 1) throw new Error('Repeat all must wrap inside the favorites queue.');
repeatQueue.toggleShuffle();
const shuffled = repeatQueue.snapshot();
if (!shuffled.shuffle || shuffled.context.type !== 'favorites' || shuffled.baseQueue.length !== 2) {
  throw new Error('Shuffle must preserve the favorites context.');
}

const removalQueue = createQueueController({ allIndexes: [0, 1, 2, 3, 4, 5] });
removalQueue.setContext([1, 3, 5], 1, { type: 'favorites', id: 'local' });
removalQueue.setContext([3, 5], 1, { type: 'favorites', id: 'local' });
if (removalQueue.current() !== 1 || ![3, 5].includes(removalQueue.next())) {
  throw new Error('Removing the current favorite must let it finish before another favorite plays.');
}

const emptyQueue = createQueueController({ allIndexes: [0, 1, 2] });
emptyQueue.setContext([1], 1, { type: 'favorites', id: 'local' });
emptyQueue.setContext([], 1, { type: 'favorites', id: 'local' });
if (emptyQueue.next() !== null || emptyQueue.snapshot().context.type !== 'favorites') {
  throw new Error('An emptied favorites queue must not fall back to the catalog.');
}

console.log('Dedicated favorites playback, shuffle, repeat and removal are covered.');

