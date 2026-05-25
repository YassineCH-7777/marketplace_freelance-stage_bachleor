import { Heart, Loader2 } from 'lucide-react';

export default function FavoriteButton({
  active = false,
  loading = false,
  onClick,
  label = 'Sauvegarder',
  activeLabel = 'Retirer des favoris',
  compact = false,
}) {
  const title = active ? activeLabel : label;

  return (
    <button
      type="button"
      className={`favorite-button ${active ? 'is-active' : ''} ${compact ? 'is-compact' : ''}`}
      onClick={onClick}
      disabled={loading}
      aria-pressed={active}
      aria-label={title}
      title={title}
    >
      {loading ? (
        <Loader2 size={compact ? 15 : 17} className="spinner" />
      ) : (
        <Heart size={compact ? 15 : 17} fill={active ? 'currentColor' : 'none'} />
      )}
      {!compact && <span>{active ? 'Favori' : 'Sauvegarder'}</span>}
    </button>
  );
}
