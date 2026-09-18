// Server copy of client/src/utils/cei.js, so the ZIP scoring script can match
// business names to Corporate Equality Index companies the same way.

const normalise = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export function matchCEI(businessName, entries = []) {
  if (!businessName || entries.length === 0) return null;

  const haystack = ` ${normalise(businessName)} `;
  let best = null;

  for (const entry of entries) {
    // Ordinary-word brands ("Target") only count at the start of a name.
    const brands = [
      ...(entry.brands ?? []).map((name) => ({ name, anchored: false })),
      ...(entry.anchoredBrands ?? []).map((name) => ({ name, anchored: true })),
    ];

    for (const { name: brand, anchored } of brands) {
      const needle = ` ${normalise(brand)} `;
      const hit = anchored ? haystack.startsWith(needle) : haystack.includes(needle);

      // The longest matching brand wins.
      if (hit && (!best || brand.length > best.matchLength)) {
        best = { ...entry, matchedBrand: brand, matchLength: brand.length };
      }
    }
  }

  return best;
}
