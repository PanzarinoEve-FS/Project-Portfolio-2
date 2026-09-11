
export default function SearchField({ value, onChange, placeholder = 'Search', onSubmit }) {
  return (
    <form
      className="search-field"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.(value);
      }}
    >
      <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M6.5 1a5.5 5.5 0 0 1 4.38 8.83l3.65 3.64a.75.75 0 1 1-1.06 1.06l-3.64-3.65A5.5 5.5 0 1 1 6.5 1Zm0 1.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
      </svg>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />

      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', color: 'inherit' }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0Zm2.83 4.46L8 7.29 5.17 4.46a.75.75 0 0 0-1.06 1.06L6.94 8.35 4.11 11.18a.75.75 0 1 0 1.06 1.06L8 9.41l2.83 2.83a.75.75 0 0 0 1.06-1.06L9.06 8.35l2.83-2.83a.75.75 0 0 0-1.06-1.06Z" />
          </svg>
        </button>
      )}
    </form>
  );
}
