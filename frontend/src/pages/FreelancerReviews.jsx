import { useState, useEffect } from 'react';
import useAuth from '../hooks/useAuth';
import { Star, Inbox, Loader2 } from 'lucide-react';
import API from '../api/axiosConfig';
import './Dashboard.css';

export default function FreelancerReviews() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      API.get(`/public/freelancers/${user.id}/reviews`)
        .then(r => setReviews(r.data))
        .catch(() => setReviews([]))
        .finally(() => setLoading(false));
    }
  }, [user]);

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star key={i} size={16} fill={i < rating ? 'currentColor' : 'none'} className={i < rating ? '' : 'empty'} />
    ));
  };

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '—';

  return (
    <div className="dashboard-page">
      <div className="container">
        <div className="dashboard-header animate-fade-in-up">
          <h1 className="dashboard-title"><Star size={28} style={{ display: 'inline', verticalAlign: 'middle', color: 'var(--warning)' }} /> Avis Reçus</h1>
          <p className="dashboard-subtitle">
            Note moyenne : <span style={{ color: 'var(--warning)', fontWeight: 800, fontSize: 'var(--text-xl)' }}>{avgRating}</span> / 5
            {reviews.length > 0 && <span style={{ color: 'var(--text-muted)' }}> ({reviews.length} avis)</span>}
          </p>
        </div>

        {loading ? (
          <div className="empty-state"><Loader2 size={32} className="spinner" /></div>
        ) : reviews.length === 0 ? (
          <div className="empty-state animate-fade-in-up">
            <div className="empty-state-icon"><Inbox size={48} /></div>
            <h3 className="empty-state-title">Aucun avis encore</h3>
            <p className="empty-state-desc">Vos clients pourront laisser un avis une fois leurs commandes terminées.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 'var(--space-5)' }} className="stagger">
            {reviews.map(review => (
              <div className="review-card animate-fade-in-up" key={review.id}>
                <div className="review-header">
                  <div className="review-stars">{renderStars(review.rating)}</div>
                  <span className="review-author">{review.clientEmail}</span>
                </div>
                {review.comment && <p className="review-comment">{review.comment}</p>}
                <p className="review-date">{new Date(review.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
