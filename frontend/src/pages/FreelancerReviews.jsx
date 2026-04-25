import { useEffect, useMemo, useState } from 'react';
import { Inbox, Loader2, MessageSquare, Star } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import { getFreelancerReviews } from '../api/reviewApi';
import { formatReviewScore, getReviewAverage, getReviewAxisAverages, reviewAxes } from '../utils/reviewMeta';
import './Dashboard.css';

function renderStars(rating) {
  return Array.from({ length: 5 }, (_, index) => (
    <Star
      key={index}
      size={16}
      fill={index < Math.round(rating) ? 'currentColor' : 'none'}
      className={index < Math.round(rating) ? '' : 'empty'}
    />
  ));
}

function formatReviewDate(review) {
  const createdAt = review?.createdAt ? new Date(review.createdAt) : null;
  const updatedAt = review?.updatedAt ? new Date(review.updatedAt) : null;
  const hasUpdate = createdAt && updatedAt && updatedAt.getTime() > createdAt.getTime();
  const referenceDate = hasUpdate ? updatedAt : createdAt;

  if (!referenceDate) {
    return null;
  }

  return `${hasUpdate ? 'Mis a jour le' : 'Depose le'} ${referenceDate.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })}`;
}

export default function FreelancerReviews() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    getFreelancerReviews(user.id)
      .then((response) => setReviews(response.data))
      .catch(() => setReviews([]))
      .finally(() => setLoading(false));
  }, [user]);

  const overallAverage = useMemo(() => {
    if (reviews.length === 0) {
      return null;
    }

    const total = reviews.reduce((sum, review) => sum + (getReviewAverage(review) || 0), 0);
    return total / reviews.length;
  }, [reviews]);

  const axisAverages = useMemo(() => getReviewAxisAverages(reviews), [reviews]);

  return (
    <div className="dashboard-page">
      <div className="container">
        <div className="dashboard-header animate-fade-in-up">
          <h1 className="dashboard-title">
            <Star size={28} style={{ display: 'inline', verticalAlign: 'middle', color: 'var(--warning)' }} /> Avis recus
          </h1>
          <p className="dashboard-subtitle">
            Note globale : <span style={{ color: 'var(--warning)', fontWeight: 800, fontSize: 'var(--text-xl)' }}>{formatReviewScore(overallAverage)}</span> / 5
            {reviews.length > 0 && <span style={{ color: 'var(--text-muted)' }}> ({reviews.length} avis)</span>}
          </p>
        </div>

        {!loading && reviews.length > 0 && (
          <div className="review-summary-grid animate-fade-in-up">
            <div className="review-summary-card">
              <span className="review-summary-label">Global</span>
              <strong>{formatReviewScore(overallAverage)} / 5</strong>
              <p>Lecture rapide de la satisfaction sur les missions locales.</p>
            </div>
            {axisAverages.map((axis) => (
              <div className="review-summary-card" key={axis.key}>
                <span className="review-summary-label">{axis.label}</span>
                <strong>{formatReviewScore(axis.average)} / 5</strong>
                <p>{axis.helper}</p>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div className="empty-state">
            <Loader2 size={32} className="spinner" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="empty-state animate-fade-in-up">
            <div className="empty-state-icon">
              <Inbox size={48} />
            </div>
            <h3 className="empty-state-title">Aucun avis encore</h3>
            <p className="empty-state-desc">Vos clients pourront laisser un avis detaille une fois leurs missions terminees.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 'var(--space-5)' }} className="stagger">
            {reviews.map((review) => {
              const reviewAverage = getReviewAverage(review) || review.rating || 0;
              const dateLabel = formatReviewDate(review);

              return (
                <div className="review-card animate-fade-in-up" key={review.id}>
                  <div className="review-header">
                    <div>
                      <div className="review-stars">{renderStars(reviewAverage)}</div>
                      <p className="review-rating-copy">Note globale {formatReviewScore(reviewAverage)} / 5</p>
                    </div>
                    <span className="review-author">{review.clientEmail}</span>
                  </div>

                  <div className="review-axis-breakdown">
                    {reviewAxes.map((axis) => (
                      <div className="review-axis-pill" key={axis.key}>
                        <span>{axis.label}</span>
                        <strong>{review[axis.key] || review.rating || '--'} / 5</strong>
                      </div>
                    ))}
                  </div>

                  {review.comment && (
                    <div className="review-comment-block">
                      <span className="review-comment-label">
                        <MessageSquare size={14} /> Retour client
                      </span>
                      <p className="review-comment">{review.comment}</p>
                    </div>
                  )}

                  {dateLabel && <p className="review-date">{dateLabel}</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
