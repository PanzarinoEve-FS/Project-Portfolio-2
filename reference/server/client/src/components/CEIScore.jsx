import { ceiBand } from '../utils/cei.js';

// Only a verified score earns confident color
function tone(match) {
  return match.verified ? ceiBand(match.score) : 'unconfirmed';
}

function statusLine(match) {
  if (match.verified) {
    return `Submitted and confirmed by HRC for ${match.year}.`;
  }

  if (match.score === 0) {
    return `Did not submit a ${match.year} survey, and HRC credited no qualifying public policies. That is an absence of confirmed policies, not a measure of hostility.`;
  }

  return `Did not submit a ${match.year} survey. HRC scored this from publicly available information.`;
}

// Shows a company's Corporate Equality Index score for a business 
export default function CEIScore({ match, maxScore = 100, detailed = false }) {
  if (!match) return null;

  return (
    <div className={`cei cei-${tone(match)}`}>
      <div className="cei-head">
        <span className="cei-label">HRC Corporate Equality Index</span>
        <span className="cei-score">
          {match.score} / {maxScore}
        </span>
      </div>

      <p className="cei-company">
        {match.company} &middot; {match.year}
      </p>

      <p className={`cei-status ${match.verified ? 'verified' : 'unverified'}`}>
        <strong>{match.verified ? 'Verified' : 'Not submitted'}</strong>
        {' - '}
        {statusLine(match)}
      </p>

      {detailed && (
        <>
          <p className="cei-note">
            This rates the parent company's workplace policies for its own employees.
            It does not measure how this particular location treats customers.
          </p>
          <a className="cei-source" href={match.source} target="_blank" rel="noreferrer">
            View {match.company} on hrc.org
          </a>
        </>
      )}
    </div>
  );
}
