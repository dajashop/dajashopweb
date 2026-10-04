import React, { useState, useEffect } from 'react';
import { Star, LogIn } from 'lucide-react';
// import { useNavigate } from 'react-router-dom'; // Više nam ne treba za login dugme
import { useAuth } from '../../hooks/useAuth';
import { addReview, getProductReviews } from '../../services/reviews';
import { useFlash } from '../../hooks/useFlash';
import './ProductReviews.css';

export default function ProductReviews({ product }) {
  // [IZMENA] Izvlačimo showAuth funkciju iz konteksta
  const { user, showAuth } = useAuth();
  const { flash } = useFlash();

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  // State za formu
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Učitavanje recenzija
  useEffect(() => {
    if (product?.id) {
      loadReviews();
    }
  }, [product]);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const data = await getProductReviews(product.id);
      setReviews(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      alert('Molimo vas ocenite proizvod zvezdicama.');
      return;
    }
    if (!comment.trim()) {
      alert('Molimo vas napišite komentar.');
      return;
    }

    setSubmitting(true);
    try {
      await addReview(product.id, user, { rating, comment });
      flash('Uspešno', 'Hvala na vašoj recenziji!', 'success');
      setRating(0);
      setComment('');
      await loadReviews();
    } catch (err) {
      flash('Greška', 'Došlo je do greške prilikom slanja.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const averageRating = reviews.length
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(
        1
      )
    : 0;

  const renderStars = (count, size = 16, interactive = false) => {
    return [...Array(5)].map((_, i) => {
      const starValue = i + 1;
      const isFilled = interactive
        ? starValue <= (hoverRating || rating)
        : starValue <= count;

      return (
        <Star
          key={i}
          size={size}
          fill={isFilled ? 'currentColor' : 'none'}
          className={
            interactive ? `star-input ${isFilled ? 'filled' : ''}` : ''
          }
          onMouseEnter={
            interactive ? () => setHoverRating(starValue) : undefined
          }
          onMouseLeave={interactive ? () => setHoverRating(0) : undefined}
          onClick={interactive ? () => setRating(starValue) : undefined}
        />
      );
    });
  };

  if (loading)
    return <div className="p-4 text-center text-gray-500">Učitavanje...</div>;

  return (
    <div className="reviews-container">
      {/* 1. STATISTIKA */}
      <div className="reviews-summary">
        <div className="big-rating">{averageRating}</div>
        <div className="stars-summary">
          <div className="stars-row">
            {renderStars(Math.round(averageRating), 20)}
          </div>
          <span className="total-reviews">
            Na osnovu {reviews.length} recenzija
          </span>
        </div>
      </div>

      {/* 2. LISTA */}
      <div className="reviews-list">
        {reviews.length === 0 ? (
          <p className="no-reviews-text">
            Još uvek nema recenzija. Budite prvi!
          </p>
        ) : (
          reviews.map((rev) => (
            <div key={rev.id} className="review-item">
              <div className="review-header">
                <span className="reviewer-name">{rev.userName}</span>
                <span className="review-date">
                  {rev.createdAt?.seconds
                    ? new Date(rev.createdAt.seconds * 1000).toLocaleDateString(
                        'sr-RS'
                      )
                    : 'Upravo sada'}
                </span>
              </div>
              <div className="review-rating">{renderStars(rev.rating, 14)}</div>
              <p className="review-text">{rev.comment}</p>
            </div>
          ))
        )}
      </div>

      {/* 3. FORMA ILI LOGIN DUGME */}
      {user ? (
        <form className="review-form" onSubmit={handleSubmit}>
          <h3 className="form-title">Napišite recenziju</h3>
          <div className="rating-input">{renderStars(0, 28, true)}</div>
          <textarea
            className="comment-input"
            placeholder="Podelite vaše utiske o ovom proizvodu..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={submitting}
          />
          <button type="submit" className="submit-btn" disabled={submitting}>
            {submitting ? 'Slanje...' : 'Pošalji recenziju'}
          </button>
        </form>
      ) : (
        // [IZMENA] Dugme sada otvara Modal
        <div className="login-prompt-box">
          <div className="prompt-icon">
            <LogIn size={24} />
          </div>
          <h3>Želite da ostavite recenziju?</h3>
          <p>Morate biti prijavljeni da biste ocenili proizvod.</p>

          <button
            onClick={() => showAuth('login')}
            className="login-btn-action"
          >
            Prijavi se / Registruj se
          </button>
        </div>
      )}
    </div>
  );
}
