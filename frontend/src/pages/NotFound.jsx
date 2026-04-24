import { ArrowLeft, Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import './Dashboard.css';

export default function NotFound() {
  return (
    <div className="dashboard-page">
      <div className="container">
        <div
          className="card animate-fade-in-up"
          style={{
            marginTop: '2rem',
            textAlign: 'center',
            padding: '4rem 2rem',
          }}
        >
          <div
            style={{
              width: '72px',
              height: '72px',
              margin: '0 auto 1.5rem',
              borderRadius: '1.25rem',
              display: 'grid',
              placeItems: 'center',
              background: 'rgba(99, 102, 241, 0.12)',
              color: 'var(--primary-400)',
            }}
          >
            <Compass size={34} />
          </div>

          <h1 style={{ fontSize: 'var(--text-4xl)', fontWeight: 900, marginBottom: '0.75rem' }}>
            Page introuvable
          </h1>
          <p
            style={{
              maxWidth: '560px',
              margin: '0 auto 2rem',
              color: 'var(--text-muted)',
            }}
          >
            Le lien demande n&apos;existe pas ou n&apos;est plus disponible. Vous pouvez revenir a
            l&apos;accueil ou explorer les services publies.
          </p>

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <Link className="btn btn-primary" to="/">
              Retour a l&apos;accueil
            </Link>
            <Link className="btn btn-secondary" to="/services">
              <ArrowLeft size={16} />
              Voir les services
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
