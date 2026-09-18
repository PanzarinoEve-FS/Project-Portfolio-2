const STANCE_LABEL = {
  friendly: 'Friendly',
  mixed: 'Mixed',
  unfriendly: 'Unfriendly',
  unclear: 'Unclear',
};

// LGBTQIA+ reviews of this place found on the web. 
// Each keeps a link back to the article it came from, so a reader can check the source
export default function WebReviewSection({ reviews = [] }) {
  if (reviews.length === 0) return null;

  return (
    <div className="panel">
      <h2>Web Reviews</h2>

      <ul className="business-reviews">
        {reviews.map((review) => (
          <li key={review.key}>
            <div className="business-review-head">
              <span className={`stance-dot is-${review.stance}`} />
              <strong>{STANCE_LABEL[review.stance] ?? 'Unclear'}</strong>
              <span className="muted">
                {review.scope === 'brand' ? 'whole chain' : 'this location'}
                {review.origin === 'google' && ' · Google Maps, read automatically'}
              </span>
            </div>

            {review.quote && <q className="zip-quote">{review.quote}</q>}
            {review.summary && <p className="business-review-summary">{review.summary}</p>}

            <div className="business-review-foot">
              <span className="muted">{review.source?.publisher || review.publisher || review.title}</span>
              {(review.source?.url || review.url) && (
                <a
                  className="chip"
                  href={review.source?.url || review.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  View Web Article
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
