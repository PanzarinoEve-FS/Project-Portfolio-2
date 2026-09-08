// iOS switch. Rendered as a button with role="switch" rather than a checkbox
// so it can carry the platform's exact 51x31 geometry and spring animation
// while staying keyboard operable and announced correctly by VoiceOver.
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
