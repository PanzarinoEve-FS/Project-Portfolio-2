// How a business and a ZIP are scored. Shared by the scoring script, which
// writes the numbers, and the API route, which reports how they were made.

export const SAFETY_METHOD = {
  // A ZIP needs this many places with local evidence before it gets a color.
  minScored: 3,
  // Green only at 95 or above; anything under 85 is red.
  bands: { good: 95, mixed: 85 },
  // Lived experience counts most; corporate policy least.
  weights: { reviews: 3, web: 2, restroom: 2, brand: 1, cei: 1, ceiUnverified: 0.6 },
  // A place whose own reviews are mostly unfriendly - more unfriendly than
  // friendly - counts this many times over: once against its other signals,
  // and again in its ZIP's average. A community rating of 2 stars or fewer
  // counts the same way. A single critical review among good ones does not, or
  // the places people write about most would always score worst.
  //
  // It is this high because most counted places have no LGBTQIA+ review at all:
  // they are counted for a documented gender-neutral restroom nearby, which
  // scores 100. Dozens of those would otherwise outvote every documented
  // refusal of service in a ZIP - 32803 read High while listing ten unfriendly
  // reviews. Weighted this way it reads Mixed instead. Higher still would push
  // the city's LGBTQIA+ district to Low, which is the opposite mistake: that is
  // where LGBTQIA+ people write the most reviews, critical ones included.
  badReviewMultiplier: 10,
  badRatingMax: 2,
  // How close a documented gender-neutral restroom has to be to count for a
  // business. At this distance it is really a fact about the neighbourhood
  // rather than the storefront: the restroom may be a quarter of a mile away at
  // a park or a library. It is set this wide deliberately, because outside
  // Orlando almost nothing else is documented - most ZIPs have a handful of
  // known restrooms and no LGBTQIA+ reviews at all - and a grey map says less
  // to someone deciding where it is safe to go. A ZIP coloured this way says so
  // plainly in its profile.
  restroomRadiusM: 800,
  // Evidence about the place itself. A chain-wide review or a CEI score says
  // how a company behaves, not how this location treats people, so it can shade
  // a business's score but never colors a ZIP on its own - in either direction.
  localSources: ['reviews', 'web', 'restroom'],
};

const STANCE_VALUE = { friendly: 100, mixed: 50, unfriendly: 0 };

// Places that exist to serve LGBTQIA+ people: community centers, pride
// organisations, queer bars. They collect far more LGBTQIA+ reviews than any
// other business, and the critical ones are written by the people they serve -
// a bad night at the gay bar, being misgendered by staff at the center. Those
// experiences are real and stay on the record, but they do not mean the area
// is unsafe for LGBTQIA+ people, which is what a refusal of service means. So
// criticism of these places never counts several times over, and their
// presence is never turned into evidence against their own neighbourhood.
const COMMUNITY_VENUES = [
  /\blgbtq?\+?\b/i,
  /\bpride\b/i,
  /\bqueer\b/i,
  /the center orlando/i,
  /southern nights/i,
  /hamburger mary/i,
  /savoy orlando/i,
  /district dive/i,
  /\bbookburn\b/i,
];

export const isCommunityVenue = (name = '') => COMMUNITY_VENUES.some((rx) => rx.test(name));

// Average stance of the web reviews that apply, or null when there are none.
// With `badCounts`, each unfriendly review counts that many times.
function stanceScore(reviews = [], badCounts = 1) {
  let total = 0;
  let count = 0;
  for (const review of reviews) {
    const value = STANCE_VALUE[review.stance];
    if (value == null) continue;
    const times = review.stance === 'unfriendly' ? badCounts : 1;
    total += value * times;
    count += times;
  }
  return count ? total / count : null;
}

// 0-100 from whichever signals a business has, or null when it has none.
// A missing signal is left out, never counted as zero: no documented restroom
// is not the same as no restroom, and no LGBTQIA+ review is not a bad one.
export function scoreBusiness({
  review = null,
  webReviews = [],
  brandReviews = [],
  nearRestroom = false,
  cei = null,
  name = '',
} = {}) {
  const { weights, badRatingMax } = SAFETY_METHOD;
  // A queer space is not marked down several times over for the complaints of
  // the people it serves.
  const community = isCommunityVenue(name);
  const times = community ? 1 : SAFETY_METHOD.badReviewMultiplier;
  const parts = [];
  let bad = false;

  if (review) {
    const badRating = review.overall <= badRatingMax;
    bad ||= badRating;
    parts.push({
      source: 'reviews',
      value: ((review.overall - 1) / 4) * 100,
      weight: weights.reviews * (badRating ? times : 1),
    });
  }

  const unfriendly = webReviews.filter((item) => item.stance === 'unfriendly').length;
  const friendly = webReviews.filter((item) => item.stance === 'friendly').length;
  const badWeb = unfriendly > friendly;
  const web = stanceScore(webReviews, badWeb ? times : 1);
  if (web != null) {
    bad ||= badWeb;
    parts.push({ source: 'web', value: web, weight: weights.web * (badWeb ? times : 1) });
  }

  if (nearRestroom) {
    parts.push({ source: 'restroom', value: 100, weight: weights.restroom });
  }

  const brand = stanceScore(brandReviews);
  if (brand != null) parts.push({ source: 'brand', value: brand, weight: weights.brand });

  if (cei && typeof cei.score === 'number') {
    parts.push({
      source: 'cei',
      value: cei.score,
      weight: cei.verified ? weights.cei : weights.ceiUnverified,
    });
  }

  if (parts.length === 0) return null;

  const average = (list) => {
    const weight = list.reduce((sum, part) => sum + part.weight, 0);
    return weight ? Math.round(list.reduce((sum, part) => sum + part.value * part.weight, 0) / weight) : null;
  };

  const total = parts.reduce((sum, part) => sum + part.weight, 0);
  const sources = parts.map((part) => part.source);
  const score = Math.round(parts.reduce((sum, part) => sum + part.value * part.weight, 0) / total);

  // Nobody has reviewed this location: everything known about it beyond a
  // restroom is company-wide. Those signals still shade the number shown on its
  // profile, but the one its ZIP averages leaves them out, because a chain's
  // corporate record is not evidence about this neighbourhood. Without this a
  // few chain stores with poor CEI scores turned a whole ZIP red while nobody
  // had reported anything at all about the places in it.
  const reviewed = Boolean(review) || webReviews.length > 0;
  const localParts = parts.filter((part) => SAFETY_METHOD.localSources.includes(part.source));
  const zipScore = reviewed ? score : average(localParts) ?? score;

  return {
    score,
    zipScore,
    sources,
    local: sources.some((source) => SAFETY_METHOD.localSources.includes(source)),
    bad: bad && !community,
    community,
  };
}

// A ZIP's score: the average of its businesses, with any business that has a
// bad review counted several times over.
export function scoreZip(businesses) {
  let total = 0;
  let weight = 0;
  for (const business of businesses) {
    const times = business.bad ? SAFETY_METHOD.badReviewMultiplier : 1;
    total += (business.zipScore ?? business.score) * times;
    weight += times;
  }
  return weight ? Math.round(total / weight) : null;
}

export function bandFor(score, scored) {
  if (score == null || scored < SAFETY_METHOD.minScored) return 'insufficient';
  if (score >= SAFETY_METHOD.bands.good) return 'good';
  if (score >= SAFETY_METHOD.bands.mixed) return 'mixed';
  return 'poor';
}
