import { fromKm, toKm } from '../utils/distance.js';

export const RANGE_BOUNDS = {
  km: { min: 1, max: 40, step: 1 },
  mi: { min: 1, max: 25, step: 1 },
};

// Switching units keeps the real distance rather than the number, so 6 mi
// becomes ~10 km instead of jumping to 6 km.
export function convertRange(range, fromUnit, toUnit) {
  const bounds = RANGE_BOUNDS[toUnit];
  const snapped = Math.round(fromKm(toKm(range, fromUnit), toUnit) / bounds.step) * bounds.step;
  return Math.min(bounds.max, Math.max(bounds.min, snapped));
}

export const rangeLabel = (range, unit) =>
  `${range} ${unit === 'mi' ? (range === 1 ? 'mile' : 'miles') : 'km'}`;

// Slider plus a km/mi segmented control, shared by every map view.
export default function RangeControl({ range, unit, onRangeChange, onUnitChange, id = 'range' }) {
  const bounds = RANGE_BOUNDS[unit];

  return (
    <div className="group">
      <label className="group-label" htmlFor={id}>
        Range
      </label>

      <div className="range-row">
        <input
          id={id}
          type="range"
          min={bounds.min}
          max={bounds.max}
          step={bounds.step}
          value={range}
          onChange={(e) => onRangeChange(Number(e.target.value))}
          aria-label="Search range"
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
                onRangeChange(convertRange(range, unit, option));
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
