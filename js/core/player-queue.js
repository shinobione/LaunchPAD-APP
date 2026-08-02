const REPEAT_MODES = ['off', 'all', 'one'];

function uniqueIndexes(indexes) {
  return [...new Set(indexes.filter(Number.isInteger))];
}

function shuffled(values) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

export function createQueueController({ allIndexes }) {
  const listeners = new Set();
  const catalogIndexes = uniqueIndexes(allIndexes);

  let baseQueue = [...catalogIndexes];
  let queue = [...baseQueue];
  let position = 0;
  let shuffle = false;
  let repeat = 'off';
  let context = { type: 'catalog', id: 'all' };

  function current() {
    return queue[position] ?? baseQueue[0] ?? catalogIndexes[0] ?? 0;
  }

  function snapshot() {
    return {
      baseQueue: [...baseQueue],
      queue: [...queue],
      position,
      currentIndex: current(),
      shuffle,
      repeat,
      context: { ...context }
    };
  }

  function emit() {
    const state = snapshot();
    listeners.forEach(listener => listener(state));
  }

  function rebuild(currentIndex = current()) {
    const cleanBase = uniqueIndexes(baseQueue);
    if (!cleanBase.length) cleanBase.push(...catalogIndexes);
    baseQueue = cleanBase;

    if (shuffle) {
      const rest = shuffled(baseQueue.filter(index => index !== currentIndex));
      queue = [currentIndex, ...rest];
      position = 0;
      return;
    }

    queue = [...baseQueue];
    if (!queue.includes(currentIndex)) queue.unshift(currentIndex);
    position = Math.max(0, queue.indexOf(currentIndex));
  }

  function setContext(indexes, currentIndex = indexes[0], nextContext = { type: 'catalog', id: 'all' }) {
    baseQueue = uniqueIndexes(indexes);
    context = { ...nextContext };
    rebuild(currentIndex);
    emit();
    return current();
  }

  function select(index, { preserveContext = true } = {}) {
    if (!Number.isInteger(index)) return current();

    if (!preserveContext || !baseQueue.includes(index)) {
      baseQueue = [...catalogIndexes];
      context = { type: 'catalog', id: 'all' };
      rebuild(index);
    } else if (queue.includes(index)) {
      position = queue.indexOf(index);
    } else {
      rebuild(index);
    }

    emit();
    return current();
  }

  function next({ ended = false } = {}) {
    if (ended && repeat === 'one') {
      emit();
      return current();
    }

    if (position < queue.length - 1) {
      position += 1;
      emit();
      return current();
    }

    if (repeat === 'all' && queue.length) {
      position = 0;
      emit();
      return current();
    }

    emit();
    return null;
  }

  function previous() {
    if (position > 0) {
      position -= 1;
      emit();
      return current();
    }

    if (repeat === 'all' && queue.length) {
      position = queue.length - 1;
      emit();
      return current();
    }

    emit();
    return current();
  }

  function toggleShuffle() {
    const currentIndex = current();
    shuffle = !shuffle;
    rebuild(currentIndex);
    emit();
    return shuffle;
  }

  function cycleRepeat() {
    repeat = REPEAT_MODES[(REPEAT_MODES.indexOf(repeat) + 1) % REPEAT_MODES.length];
    emit();
    return repeat;
  }

  function upcoming(limit = 5) {
    if (!queue.length || limit <= 0) return [];
    const result = queue.slice(position + 1, position + 1 + limit);

    if (repeat === 'all' && result.length < limit) {
      result.push(...queue.slice(0, Math.min(position + 1, limit - result.length)));
    }

    return result;
  }

  function subscribe(listener) {
    listeners.add(listener);
    listener(snapshot());
    return () => listeners.delete(listener);
  }

  return {
    current,
    snapshot,
    setContext,
    select,
    next,
    previous,
    toggleShuffle,
    cycleRepeat,
    upcoming,
    subscribe
  };
}
