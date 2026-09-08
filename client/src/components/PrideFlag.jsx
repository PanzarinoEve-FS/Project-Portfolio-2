// Vite resolves this to a hashed asset URL at build time.
import flag from '../images/images-3.png';

// Intersex-inclusive Progress Pride flag banner at the top of the sidebar.
// Height is left to the image's own aspect ratio.
export default function PrideFlag({ className = 'flag' }) {
  return (
    <img
      className={className}
      src={flag}
      alt="Intersex-inclusive Progress Pride flag"
    />
  );
}
