
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

    const brands = [
      ...(entry.brands ?? []).map((name) => ({ name, anchored: false })),
      ...(entry.anchoredBrands ?? []).map((name) => ({ name, anchored: true })),
    ];

    for (const { name: brand, anchored } of brands) {
      const needle = ` ${normalise(brand)} `;
      const hit = anchored ? haystack.startsWith(needle) : haystack.includes(needle);

      if (hit && (!best || brand.length > best.matchLength)) {
        best = { ...entry, matchedBrand: brand, matchLength: brand.length };
      }
    }
  }

  return best;
}

export function ceiBand(score) {
  if (score >= 80) return 'good';
  if (score >= 40) return 'mixed';
  return 'poor';
}
