// iOS switch. Rendered as a button with role="switch" 
export default function Switch({ checked, onChange, label, id }) {
  return (
    <div className="switch-row">
      <label htmlFor={id}>{label}</label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className="switch"
        onClick={() => onChange(!checked)}
      />
    </div>
  );
}
