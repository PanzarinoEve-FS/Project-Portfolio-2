import { useState } from 'react';

import { addSurgeonReview } from '../../api/client.js';
import StarRating from '../Apple Design Elements/StarRating.jsx';
import RatingsChart from '../Apple Design Elements/RatingsChart.jsx';

export default function SurgeonReviews({ slug, reviews = [], average, onChange }) {
  const [rating, setRating] = useState(0);
  const [author, setAuthor] = useState('');
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    if (!rating) return setError('Pick a star rating first.');

    setSaving(true);
    setError('');

    try {
      const result = await addSurgeonReview(slug, { author, rating, comment });
      onChange?.(result);
      setRating(0);
      setAuthor('');
      setComment('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="panel">
        <h2>Community Rating</h2>

        {average ? (
          <>
            <div className="rating-summary">
              <StarRating value={average} />
              <span className="score">{average} / 5</span>
              <span className="muted">
                {reviews.length} review{reviews.length === 1 ? '' : 's'}
              </span>
            </div>

            <RatingsChart reviews={reviews} />
          </>
        ) : (
          <p className="empty">No ratings yet. Be the first.</p>
        )}
      </div>

      <div className="panel">
        <h2>Leave a Review</h2>

        <form className="review-form" onSubmit={handleSubmit}>
          <StarRating value={rating} onChange={setRating} size={30} label="Your rating" />

          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Your name (optional)"
            aria-label="Your name"
          />

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
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

      {reviews.length > 0 && (
        <div className="panel">
          <h2>
            {reviews.length} Review{reviews.length === 1 ? '' : 's'}
          </h2>

          {reviews.map((r) => (
            <div key={r._id} className="review">
              <div className="card-head">
                <strong>{r.author || 'Anonymous'}</strong>
                <StarRating value={r.rating} size={14} />
              </div>
              {r.comment && <p>{r.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
