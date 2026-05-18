import { useState } from 'react';
import AttachmentPicker from '@/components/common/AttachmentPicker';
import { Loader2, Paperclip, Save, X } from 'lucide-react';
import { getMissionProgress } from '@/utils/orderExecution';

const STATUS_OPTIONS = [
  { value: 'IN_PROGRESS', label: 'Execution en cours' },
  { value: 'WAITING_CLIENT', label: 'Attente client' },
  { value: 'DELIVERED', label: 'Livraison envoyee' },
  { value: 'REVISION', label: 'Revision en cours' },
  { value: 'CANCELLED', label: 'Mission annulee' },
];

export default function MissionUpdateModal({ order, onClose, onSubmit, submitting }) {
  const [form, setForm] = useState({
    status: order?.status === 'ACCEPTED' ? 'IN_PROGRESS' : order?.status || 'IN_PROGRESS',
    startDate: order?.startDate || '',
    endDate: order?.endDate || '',
    dueDate: order?.dueDate || '',
    progressPercentage: getMissionProgress(order),
    notes: order?.notes || '',
    deliveryNote: order?.deliveryNote || '',
  });
  const [attachmentFiles, setAttachmentFiles] = useState([]);
  const [attachmentType, setAttachmentType] = useState('DELIVERY_PROOF');

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({
      status: form.status,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      dueDate: form.dueDate || null,
      progressPercentage: Number(form.progressPercentage),
      notes: form.notes,
      deliveryNote: form.deliveryNote,
      attachmentFiles,
      attachmentType,
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
          Renseignez l'etat actuel, la progression, les jalons de livraison et le compte-rendu partage au client.
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

          <div className="mission-progress-editor">
            <div className="mission-progress-copy">
              <span>Progression</span>
              <strong>{form.progressPercentage}%</strong>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={form.progressPercentage}
              onChange={(event) =>
                setForm((current) => ({ ...current, progressPercentage: event.target.value }))
              }
            />
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
              <label className="form-label">Echeance</label>
              <input
                type="date"
                className="form-input"
                value={form.dueDate}
                onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Date de fin effective</label>
            <input
              type="date"
              className="form-input"
              value={form.endDate}
              onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Livraison ou preuve partagee</label>
            <textarea
              className="form-textarea"
              rows={4}
              value={form.deliveryNote}
              onChange={(event) => setForm((current) => ({ ...current, deliveryNote: event.target.value }))}
              placeholder="Lien, fichiers remis, elements valides, consignes de verification..."
            />
          </div>

          <div className="mission-attachment-box">
            <div className="mission-attachment-head">
              <label className="form-label"><Paperclip size={14} /> Fichiers de mission</label>
              <select
                className="form-select"
                value={attachmentType}
                onChange={(event) => setAttachmentType(event.target.value)}
                disabled={submitting}
              >
                <option value="DELIVERY_PROOF">Preuve de livraison</option>
                <option value="INVOICE">Facture</option>
                <option value="DOCUMENT">Document</option>
              </select>
            </div>
            <AttachmentPicker
              files={attachmentFiles}
              onChange={setAttachmentFiles}
              buttonLabel="Ajouter fichiers"
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Suivi ou compte-rendu</label>
            <textarea
              className="form-textarea"
              rows={5}
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              placeholder="Checklist terminee, blocages, prochaines etapes, validations obtenues..."
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
