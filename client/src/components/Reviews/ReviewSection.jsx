import StarRating from '../Apple Design Elements/StarRating.jsx';
import RatingsChart from '../Apple Design Elements/RatingsChart.jsx';
import Switch from '../Apple Design Elements/Switch.jsx';

export default function ReviewSection({ place, form, setForm, saving, error, onSubmit, reviewCount }) {
  const averages = place.averages || {};
  const average = averages.overall || 0;

  return (
    <>
      <div className="panel">
        <h2>Community Rating</h2>

        {reviewCount > 0 ? (
          <>
            <div className="rating-summary">
              <StarRating value={average} />
              <span className="score">{average} / 5</span>
              <span className="muted">
                {reviewCount} review{reviewCount === 1 ? '' : 's'}
              </span>
            </div>

            <RatingsChart reviews={place.reviews} />

            <div className="popup-tags">
              <span className="tag">
                Gender-neutral restroom: {averages.genderNeutral || 0} of {reviewCount}
              </span>
              <span className="tag">
                Wheelchair accessible: {averages.wheelchair || 0} of {reviewCount}
              </span>
            </div>
          </>
        ) : (
          <p className="empty">No ratings yet. Be the first.</p>
        )}
      </div>

      <div className="panel">
        <h2>Leave a Review</h2>

        <form className="review-form" onSubmit={onSubmit}>
          <StarRating
            value={form.rating}
            onChange={(rating) => setForm({ ...form, rating })}
            size={30}
            label="Your rating"
          />

          <div className="group" style={{ margin: 0 }}>
            <Switch
              id="review-gender-neutral"
              label="Gender-neutral restroom"
              checked={form.genderNeutralRestroom}
              onChange={(v) => setForm({ ...form, genderNeutralRestroom: v })}
            />
            <Switch
              id="review-wheelchair"
              label="Wheelchair accessible"
              checked={form.wheelchairAccessible}
              onChange={(v) => setForm({ ...form, wheelchairAccessible: v })}
            />
          </div>

          <input
            value={form.author}
            onChange={(e) => setForm({ ...form, author: e.target.value })}
            placeholder="Your name (optional)"
            aria-label="Your name"
          />

          <textarea
            value={form.comment}
            onChange={(e) => setForm({ ...form, comment: e.target.value })}
            placeholder="What was your experience like?"
            rows="3"
            aria-label="Your experience"
          />

          {error && <p className="error">{error}</p>}

          <button type="submit" className="primary" disabled={saving}>
            {saving ? 'Submitting...' : 'Submit Review'}
          </button>
        </form>
      </div>

      <div className="panel">
        <h2>
          {reviewCount} Review{reviewCount === 1 ? '' : 's'}
        </h2>

        {place.reviews?.map((review) => (
          <div key={review._id} className="review">
            <div className="card-head">
              <strong>{review.author || 'Anonymous'}</strong>
              <StarRating value={review.rating} size={14} />
            </div>

            {(review.genderNeutralRestroom || review.wheelchairAccessible) && (
              <div className="popup-tags">
                {review.genderNeutralRestroom && <span className="tag">Gender-neutral restroom</span>}
                {review.wheelchairAccessible && <span className="tag">Wheelchair accessible</span>}
              </div>
            )}

            {review.comment && <p>{review.comment}</p>}
          </div>
        ))}

        {reviewCount === 0 && <p className="empty">No reviews yet.</p>}
      </div>
    </>
  );
}
