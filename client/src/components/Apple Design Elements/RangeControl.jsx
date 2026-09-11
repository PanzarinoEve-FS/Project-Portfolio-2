import { fromKm, toKm } from '../../utils/distance.js';

export const RANGE_STOPS = {
  mi: [1, 2, 3, 5, 10, 15, 25, 50, 75, 100, 150, 200, 300, 500, 750, 1000, 1500],
  km: [1, 3, 5, 10, 15, 25, 40, 75, 125, 160, 250, 320, 500, 800, 1200, 1600, 2400],
};

export const RANGE_BOUNDS = {
  mi: { min: 1, max: 1500 },
  km: { min: 1, max: 2400 },
};

export function stopsFor(unit, min, max) {
  const low = min?.[unit] ?? RANGE_BOUNDS[unit].min;
  const high = max?.[unit] ?? RANGE_BOUNDS[unit].max;
  const inside = RANGE_STOPS[unit].filter((s) => s >= low && s <= high);
  return inside.length ? inside : [low];
}

const nearestStop = (value, stops) =>
  stops.reduce((best, s) => (Math.abs(s - value) < Math.abs(best - value) ? s : best), stops[0]);

export function convertRange(range, fromUnit, toUnit, min, max) {
  return nearestStop(fromKm(toKm(range, fromUnit), toUnit), stopsFor(toUnit, min, max));
}

export const rangeLabel = (range, unit) =>
  `${range} ${unit === 'mi' ? (range === 1 ? 'mile' : 'miles') : 'km'}`;

export default function RangeControl({ range, unit, onRangeChange, onUnitChange, id = 'range', min, max }) {
  const stops = stopsFor(unit, min, max);
  const index = stops.indexOf(nearestStop(range, stops));

  return (
    <div className="group">
      <label className="group-label" htmlFor={id}>
        Range
      </label>

      <div className="range-row">

        <input
          id={id}
          type="range"
          min={0}
          max={stops.length - 1}
          step={1}
          value={index}
          onChange={(e) => onRangeChange(stops[Number(e.target.value)])}
          aria-label="Search range"
          aria-valuetext={rangeLabel(range, unit)}
        />

        <output className="score" htmlFor={id}>
          {range}
        </output>

        <div className="segmented">
          {['km', 'mi'].map((option) => (
            <button
              key={option}
              type="button"
              className={option === unit ? 'active' : ''}
              onClick={() => {
                onRangeChange(convertRange(range, unit, option, min, max));
                onUnitChange(option);
              }}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
