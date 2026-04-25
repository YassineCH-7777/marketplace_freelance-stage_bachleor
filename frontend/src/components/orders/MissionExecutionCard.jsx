import { CalendarDays, CheckCircle2, ClipboardList, Download, FileText, PackageCheck, UserRound } from 'lucide-react';
import {
  downloadMissionReport,
  formatOrderDate,
  formatPlanningDate,
  getMissionChecklist,
  getOrderStatusMeta,
} from '../../utils/orderExecution';

export default function MissionExecutionCard({ order, role, onManage, onReview }) {
  const statusMeta = getOrderStatusMeta(order.status);
  const checklist = getMissionChecklist(order);
  const counterpartLabel = role === 'freelancer' ? 'Client' : 'Freelance';
  const counterpartValue = role === 'freelancer'
    ? order.clientEmail
    : order.freelancerEmail || `Freelance #${order.freelancerId}`;

  return (
    <article className="mission-card card animate-fade-in-up">
      <div className="mission-card-head">
        <div className="mission-card-copy">
          <div className="mission-card-topline">
            <span className={`badge ${statusMeta.badgeClass}`}>{statusMeta.label}</span>
            <span className="mission-card-code">Mission #{order.id}</span>
          </div>
          <h3 className="mission-card-title">{order.serviceTitle}</h3>
          <p className="mission-card-subtitle">
            <UserRound size={14} />
            {counterpartLabel} : {counterpartValue}
          </p>
        </div>
        <div className="mission-card-price">{order.amount} MAD</div>
      </div>

      <div className="mission-progress-block">
        <div className="mission-progress-copy">
          <span>Suivi d'avancement</span>
          <strong>{statusMeta.progress}%</strong>
        </div>
        <div className="mission-progress-track">
          <div
            className={`mission-progress-fill ${statusMeta.tone}`}
            style={{ width: `${statusMeta.progress}%` }}
          ></div>
        </div>
      </div>

      <div className="mission-meta-grid">
        <div className="mission-meta-card">
          <span className="mission-meta-label">
            <ClipboardList size={14} /> Brief initial
          </span>
          <p>{order.requestMessage || 'Aucun brief initial partage pour cette mission.'}</p>
        </div>
        <div className="mission-meta-card">
          <span className="mission-meta-label">
            <CalendarDays size={14} /> Planning
          </span>
          <p>Debut : {formatPlanningDate(order.startDate)}</p>
          <p>Fin : {formatPlanningDate(order.endDate)}</p>
          <p>Mise a jour : {formatOrderDate(order.updatedAt || order.createdAt)}</p>
        </div>
      </div>

      <div className="mission-checklist">
        {checklist.map((item) => (
          <div className={`mission-check-item ${item.done ? 'is-done' : ''}`} key={item.key}>
            <CheckCircle2 size={16} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      <div className="mission-report-block">
        <span className="mission-meta-label">
          <FileText size={14} /> Suivi, preuve ou compte-rendu final
        </span>
        <p>{order.notes || 'Aucun suivi n a encore ete partage pour cette mission.'}</p>
      </div>

      <div className="mission-actions">
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => downloadMissionReport(order, role)}>
          <Download size={14} /> Telecharger le compte-rendu
        </button>

        {role === 'freelancer' && (
          <button type="button" className="btn btn-primary btn-sm" onClick={() => onManage(order)}>
            <PackageCheck size={14} /> Mettre a jour le suivi
          </button>
        )}

        {role === 'client' && order.status === 'COMPLETED' && (
          <button type="button" className="btn btn-accept btn-sm" onClick={() => onReview(order)}>
            <CheckCircle2 size={14} /> {order.reviewId ? 'Modifier l avis' : 'Evaluer la mission'}
          </button>
        )}
      </div>
    </article>
  );
}
