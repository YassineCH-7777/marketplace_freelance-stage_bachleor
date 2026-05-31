import { Briefcase, Loader2, Sparkles } from 'lucide-react';

export default function Loader({ label = 'Chargement...' }) {
  return (
    <div className="premium-loader" role="status" aria-live="polite">
      <div className="premium-loader-card">
        <div className="premium-loader-mark" aria-hidden="true">
          <Briefcase size={23} />
          <Sparkles size={13} />
        </div>
        <div className="premium-loader-copy">
          <strong>ProxiSkills</strong>
          <span>
            <Loader2 size={16} className="spinner" />
            {label}
          </span>
        </div>
      </div>
    </div>
  );
}
