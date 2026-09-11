import flag from '../../images/images-3.png';

export default function PrideFlag({ className = 'flag' }) {
  return (
    <img
      className={className}
      src={flag}
      alt="Intersex-inclusive Progress Pride flag"
    />
  );
}
