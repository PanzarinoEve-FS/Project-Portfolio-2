import { useEffect, useState } from 'react';

// Dragging a slider fires a change per pixel. Nominatim is rate limited to
// roughly one request per second, so without this every drag would queue a
// backlog of requests that take many seconds to drain.
export function useDebouncedValue(value, delayMs = 500) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
