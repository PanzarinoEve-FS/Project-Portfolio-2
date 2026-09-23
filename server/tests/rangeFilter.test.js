// The range slider on Search, Services and Surgeon search all measure with
// these, so they are tested once here rather than three times over.
import {
  distanceInMetres,
  findNearestRestroom,
  toKm,
  fromKm,
  formatDistance,
  KM_PER_MILE,
} from '../../client/src/utils/distance.js';

const ORLANDO = { lat: 28.55, lng: -81.33 };

describe('distance between two points', () => {
  test('a point is no distance from itself', () => {
    expect(distanceInMetres(ORLANDO, { ...ORLANDO })).toBeCloseTo(0, 6);
  });

  test('one degree of latitude is about 111 km anywhere', () => {
    const north = { lat: ORLANDO.lat + 1, lng: ORLANDO.lng };
    expect(distanceInMetres(ORLANDO, north) / 1000).toBeGreaterThan(110.5);
    expect(distanceInMetres(ORLANDO, north) / 1000).toBeLessThan(111.5);
  });

  test('a degree of longitude is shorter than a degree of latitude this far north', () => {
    const east = { lat: ORLANDO.lat, lng: ORLANDO.lng + 1 };
    const north = { lat: ORLANDO.lat + 1, lng: ORLANDO.lng };
    expect(distanceInMetres(ORLANDO, east)).toBeLessThan(distanceInMetres(ORLANDO, north));
  });

  test('measuring is the same in either direction', () => {
    const other = { lat: 27.9, lng: -82.4 };
    expect(distanceInMetres(ORLANDO, other)).toBeCloseTo(distanceInMetres(other, ORLANDO), 6);
  });

  test('crossing the equator and the meridian does not break it', () => {
    const d = distanceInMetres({ lat: -1, lng: -1 }, { lat: 1, lng: 1 });
    expect(Number.isFinite(d)).toBe(true);
    expect(d).toBeGreaterThan(0);
  });
});

describe('the nearest documented restroom', () => {
  const at = (metresNorth) => ({ lat: ORLANDO.lat + metresNorth / 111320, lng: ORLANDO.lng });

  test('picks the closest one and reports the distance in whole metres', () => {
    const found = findNearestRestroom(ORLANDO, [
      { id: 'far', ...at(120) },
      { id: 'near', ...at(30) },
      { id: 'mid', ...at(80) },
    ]);
    expect(found.id).toBe('near');
    expect(Number.isInteger(found.metres)).toBe(true);
    expect(found.metres).toBeLessThan(35);
  });

  test('anything beyond the 150 m default is not "nearby"', () => {
    expect(findNearestRestroom(ORLANDO, [{ id: 'far', ...at(400) }])).toBeNull();
  });

  test('the radius can be widened', () => {
    const rooms = [{ id: 'far', ...at(400) }];
    expect(findNearestRestroom(ORLANDO, rooms)).toBeNull();
    expect(findNearestRestroom(ORLANDO, rooms, 500).id).toBe('far');
  });

  test('no restrooms at all is null, not a crash', () => {
    expect(findNearestRestroom(ORLANDO, [])).toBeNull();
  });

  test('the original restroom fields survive alongside the distance', () => {
    const found = findNearestRestroom(ORLANDO, [{ id: 'a', name: 'Library', unisex: true, ...at(20) }]);
    expect(found).toMatchObject({ id: 'a', name: 'Library', unisex: true });
  });
});

describe('miles and kilometres', () => {
  test('the API always receives kilometres', () => {
    expect(toKm(1, 'mi')).toBeCloseTo(KM_PER_MILE, 6);
    expect(toKm(5, 'km')).toBe(5);
  });

  test('the 15 mile default the pages open on is about 24 km', () => {
    expect(toKm(15, 'mi')).toBeCloseTo(24.14, 2);
  });

  test('converting there and back returns the same number', () => {
    for (const miles of [1, 3, 15, 50, 200]) {
      expect(fromKm(toKm(miles, 'mi'), 'mi')).toBeCloseTo(miles, 9);
    }
  });
});

describe('how a distance is written out', () => {
  test('close by is feet, further is miles', () => {
    expect(formatDistance(30, 'mi')).toMatch(/^\d+ft$/);
    expect(formatDistance(5000, 'mi')).toMatch(/^\d+\.\d{2}mi$/);
  });

  test('metric uses metres then kilometres', () => {
    expect(formatDistance(30, 'km')).toBe('30m');
    expect(formatDistance(5000, 'km')).toBe('5.00km');
  });

  test('a mile reads as about 1.00mi', () => {
    expect(formatDistance(1609.344, 'mi')).toBe('1.00mi');
  });
});
