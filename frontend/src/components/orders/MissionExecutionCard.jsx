import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  CreditCard,
  Download,
  FileText,
  GitBranch,
  MessageSquare,
  PackageCheck,
  RotateCcw,
  UserRound,
} from 'lucide-react';
import AttachmentList from '@/components/common/AttachmentList';
import {
  activeMissionStatuses,
  downloadMissionReport,
  formatOrderDate,
  formatPlanningDate,
  getMilestoneStatusMeta,
  getMissionChecklist,
  getMissionProgress,
  getOrderStatusMeta,
  getPaymentStatusMeta,
} from '@/utils/orderExecution';

export default function MissionExecutionCard({
  order,
  role,
  onAcceptDelivery,
  onManage,
  onMessage,
  onRequestRevision,
  onReview,
}) {
  const statusMeta = getOrderStatusMeta(order.status);
  const paymentMeta = getPaymentStatusMeta(order.paymentStatus);
  const progress = getMissionProgress(order);
  const checklist = getMissionChecklist(order);
  const counterpartLabel = role === 'freelancer' ? 'Client' : 'Freelance';
  const counterpartValue = role === 'freelancer'
    ? order.clientEmail
    : order.freelancerEmail || `Freelance #${order.freelancerId}`;
  const canClientReviewDelivery = role === 'client' && ['DELIVERED', 'WAITING_CLIENT'].includes(order.status);
  const canFreelancerManage = role === 'freelancer' && activeMissionStatuses.includes(order.status);

  return (
    <article className="mission-card card animate-fade-in-up">
      <div className="mission-card-head">
        <div className="mission-card-copy">
          <div className="mission-card-topline">
            <span className={`badge ${statusMeta.badgeClass}`}>{statusMeta.label}</span>
            <span className={`badge ${paymentMeta.badgeClass}`}>
              <CreditCard size={13} /> {paymentMeta.label}
            </span>
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
          <strong>{progress}%</strong>
        </div>
        <div className="mission-progress-track">
          <div
            className={`mission-progress-fill ${statusMeta.tone}`}
            style={{ width: `${progress}%` }}
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
          <p>Echeance : {formatPlanningDate(order.dueDate)}</p>
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

      {(order.milestones || []).length > 0 && (
        <div className="mission-milestone-block">
          <span className="mission-meta-label">
            <GitBranch size={14} /> Jalons
          </span>
          <div className="mission-milestone-list">
            {order.milestones.map((milestone) => {
              const milestoneMeta = getMilestoneStatusMeta(milestone.status);
              return (
                <div className="mission-milestone-item" key={milestone.id || `${order.id}-${milestone.sortOrder}`}>
                  <div>
                    <strong>{milestone.title}</strong>
                    <span>{formatPlanningDate(milestone.deadline)}</span>
                  </div>
                  <span className={`mission-milestone-status ${milestoneMeta.className}`}>
                    {milestoneMeta.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mission-meta-grid">
        <div className="mission-report-block">
          <span className="mission-meta-label">
            <PackageCheck size={14} /> Livraison
          </span>
          <p>{order.deliveryNote || 'Aucune livraison n a encore ete partagee.'}</p>
          {order.deliveredAt && <p>Livree le : {formatOrderDate(order.deliveredAt)}</p>}
          <AttachmentList attachments={order.attachments || []} compact />
        </div>
        <div className="mission-report-block">
          <span className="mission-meta-label">
            <FileText size={14} /> Suivi ou compte-rendu
          </span>
          <p>{order.notes || 'Aucun suivi n a encore ete partage pour cette mission.'}</p>
          {order.revisionRequest && <p>Revision : {order.revisionRequest}</p>}
        </div>
      </div>

      {(order.activities || []).length > 0 && (
        <div className="mission-activity-block">
          <span className="mission-meta-label">
            <Clock3 size={14} /> Timeline
          </span>
          <div className="mission-activity-list">
            {order.activities.slice(0, 4).map((activity) => (
              <div className="mission-activity-item" key={activity.id}>
                <span>{formatOrderDate(activity.createdAt)}</span>
                <div>
                  <strong>{activity.title}</strong>
                  {activity.details && <p>{activity.details}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mission-actions">
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => downloadMissionReport(order, role)}>
          <Download size={14} /> Telecharger le compte-rendu
        </button>

        {onMessage && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => onMessage(order)}>
            <MessageSquare size={14} /> {role === 'freelancer' ? 'Message client' : 'Message freelance'}
          </button>
        )}

        {canClientReviewDelivery && (
          <>
            <button type="button" className="btn btn-accept btn-sm" onClick={() => onAcceptDelivery(order)}>
              <CheckCircle2 size={14} /> Valider la livraison
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => onRequestRevision(order)}>
              <RotateCcw size={14} /> Demander revision
            </button>
          </>
        )}

        {canFreelancerManage && (
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
