import { useEffect, useState } from 'react';

// Lets a component choose WHERE to render something, which CSS cannot do --
// on a phone the panel fills the screen, so detail content belongs inside the
// sidebar rather than in a column that would cover it.
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  );

  useEffect(() => {
    const list = window.matchMedia(query);
    const onChange = (event) => setMatches(event.matches);

    setMatches(list.matches);
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

// Matches the CSS breakpoint where the sidebar goes full screen.
export const useIsCompact = () => useMediaQuery('(max-width: 820px)');
