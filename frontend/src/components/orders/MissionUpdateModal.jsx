import { useState } from 'react';
import { Loader2, Save, X } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'IN_PROGRESS', label: 'Execution en cours' },
  { value: 'COMPLETED', label: 'Mission terminee' },
  { value: 'CANCELLED', label: 'Mission annulee' },
];

export default function MissionUpdateModal({ order, onClose, onSubmit, submitting }) {
  const [form, setForm] = useState({
    status: order?.status || 'IN_PROGRESS',
    startDate: order?.startDate || '',
    endDate: order?.endDate || '',
    notes: order?.notes || '',
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({
      status: form.status,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      notes: form.notes,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Mettre a jour la mission</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <p className="mission-modal-copy">
          Renseignez une etape simple de validation, une preuve de livraison ou un compte-rendu final.
        </p>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Etape actuelle</label>
            <select
              className="form-select"
              value={form.status}
              onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mission-modal-grid">
            <div className="form-group">
              <label className="form-label">Date de debut</label>
              <input
                type="date"
                className="form-input"
                value={form.startDate}
                onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Date de fin / livraison</label>
              <input
                type="date"
                className="form-input"
                value={form.endDate}
                onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Suivi, preuve de livraison ou compte-rendu</label>
            <textarea
              className="form-textarea"
              rows={5}
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              placeholder="Checklist terminee, livrables partages, validations obtenues, prochaines etapes..."
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 size={16} className="spinner" /> Enregistrement...
                </>
              ) : (
                <>
                  <Save size={16} /> Enregistrer le suivi
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
