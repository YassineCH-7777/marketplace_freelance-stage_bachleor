import { Loader2 } from 'lucide-react';

export default function Loader({ label = 'Chargement...' }) {
  return (
    <div
      style={{
        minHeight: '40vh',
        display: 'grid',
        placeItems: 'center',
        padding: '6rem 1.5rem',
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.75rem',
          color: 'var(--text-muted)',
          fontSize: 'var(--text-sm)',
        }}
      >
        <Loader2 size={22} className="spinner" />
        <span>{label}</span>
      </div>
    </div>
  );
}
