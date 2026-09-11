
export default function StarRating({ value = 0, onChange, size = 24, label }) {
  const interactive = Boolean(onChange);

  return (
    <div className="stars" role={interactive ? 'radiogroup' : 'img'} aria-label={label || `${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= Math.round(value);
        const star = (
          <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.4L12 17.4 6.2 20.4l1.1-6.4L2.6 9.4l6.5-.9L12 2.6z"
              fill={filled ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          </svg>
        );

        return interactive ? (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n === 1 ? '' : 's'}`}
            className={filled ? 'star on' : 'star'}
            onClick={() => onChange(n)}
          >
            {star}
          </button>
        ) : (
          <span key={n} className={filled ? 'star on' : 'star'}>
            {star}
          </span>
        );
      })}
    </div>
  );
}
