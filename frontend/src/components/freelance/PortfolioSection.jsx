import { ExternalLink, Globe } from 'lucide-react';

export default function PortfolioSection({ portfolioUrl }) {
  return (
    <section className="card animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
      <div className="public-section-header">
        <h2>Portfolio</h2>
      </div>

      {portfolioUrl ? (
        <a
          className="public-portfolio-link"
          href={portfolioUrl}
          target="_blank"
          rel="noreferrer"
        >
          <span className="public-portfolio-icon">
            <Globe size={18} />
          </span>
          <span>{portfolioUrl}</span>
          <ExternalLink size={16} />
        </a>
      ) : (
        <div className="public-empty-block">
          <p>Aucun portfolio n&apos;a encore ete partage sur ce profil.</p>
        </div>
      )}
    </section>
  );
}
