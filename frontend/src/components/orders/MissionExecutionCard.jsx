import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  CreditCard,
  Download,
  FileText,
  GitBranch,
  LockKeyhole,
  MessageSquare,
  PackageCheck,
  PlayCircle,
  RotateCcw,
  ShieldCheck,
  TimerReset,
  UserRound,
} from 'lucide-react';
import AttachmentList from '@/components/common/AttachmentList';
import {
  activeMissionStatuses,
  downloadMissionReport,
  formatOrderDate,
  formatPlanningDate,
  getEscrowSteps,
  getMilestoneStatusMeta,
  getMilestoneTimerMeta,
  getMissionChecklist,
  getMissionProgress,
  getOrderStatusMeta,
  getPaymentStatusMeta,
  hasClientReviewableDelivery,
  isEscrowActionable,
  isEscrowSecured,
} from '@/utils/orderExecution';

export default function MissionExecutionCard({
  order,
  role,
  onAcceptDelivery,
  onManage,
  onMessage,
  onConfirmEscrow,
  onMilestoneUpdate,
  onOpenDispute,
  onRequestRevision,
  onReview,
  confirmingEscrow,
  savingMilestoneId,
}) {
  const [, setTimerTick] = useState(0);
  const reviewableDelivery = hasClientReviewableDelivery(order);
  const effectiveStatus =
    role === 'client' && reviewableDelivery && !['DELIVERED', 'WAITING_CLIENT'].includes(order.status)
      ? 'WAITING_CLIENT'
      : order.status;
  const statusMeta = getOrderStatusMeta(effectiveStatus);
  const paymentMeta = getPaymentStatusMeta(order.paymentStatus);
  const escrowSteps = getEscrowSteps(order);
  const escrowNeedsFunding = isEscrowActionable(order.paymentStatus);
  const escrowSecured = isEscrowSecured(order.paymentStatus);
  const progress = getMissionProgress(order);
  const checklist = getMissionChecklist(order);
  const counterpartLabel = role === 'freelancer' ? 'Client' : 'Freelance';
  const counterpartValue = role === 'freelancer'
    ? order.clientEmail
    : order.freelancerEmail || `Freelance #${order.freelancerId}`;
  const canClientReviewDelivery = role === 'client' && reviewableDelivery;
  const canClientAcceptDelivery = canClientReviewDelivery && escrowSecured;
  const orderAttachments = order.attachments || [];
  const latestRevisionAt = Math.max(
    0,
    ...(order.activities || [])
      .filter((activity) => activity.type === 'REVISION_REQUESTED')
      .map((activity) => {
        const timestamp = new Date(activity.createdAt).getTime();
        return Number.isFinite(timestamp) ? timestamp : 0;
      }),
  );
  const isRevisionDeliveryProof = (attachment) => {
    if (attachment.attachmentType !== 'DELIVERY_PROOF' || !latestRevisionAt || !attachment.createdAt) {
      return false;
    }

    const createdAt = new Date(attachment.createdAt).getTime();
    return Number.isFinite(createdAt) && createdAt >= latestRevisionAt;
  };
  const deliveryAttachments = orderAttachments.filter(
    (attachment) => attachment.attachmentType === 'DELIVERY_PROOF' && !isRevisionDeliveryProof(attachment),
  );
  const trackingAttachments = orderAttachments.filter(
    (attachment) => attachment.attachmentType !== 'DELIVERY_PROOF' || isRevisionDeliveryProof(attachment),
  );
  const hasDeliveryFile = deliveryAttachments.length > 0;
  const revisionCount = Number(order.revisionCount) || 0;
  const maxRevisionRounds = Number.isFinite(Number(order.maxRevisionRounds)) ? Number(order.maxRevisionRounds) : 3;
  const trackingMessage = order.notes
    || (order.revisionRequest ? `Revision : ${order.revisionRequest}` : 'Aucun suivi n a encore ete partage pour cette mission.');
  const canClientRequestRevision = canClientReviewDelivery && escrowSecured && revisionCount < maxRevisionRounds;
  const canFreelancerManage = role === 'freelancer' && activeMissionStatuses.includes(order.status) && escrowSecured;
  const canConfirmEscrow =
    role === 'client'
    && Boolean(onConfirmEscrow)
    && escrowNeedsFunding
    && !['COMPLETED', 'CANCELLED', 'DISPUTED'].includes(order.status);
  const escrowBlockedForFreelancer =
    role === 'freelancer' && activeMissionStatuses.includes(order.status) && escrowNeedsFunding;
  const canOpenDispute =
    Boolean(onOpenDispute) && ['ACCEPTED', 'IN_PROGRESS', 'WAITING_CLIENT', 'DELIVERED', 'REVISION'].includes(order.status);

  useEffect(() => {
    const intervalId = window.setInterval(() => setTimerTick((tick) => tick + 1), 60000);
    return () => window.clearInterval(intervalId);
  }, []);

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

      <div className="mission-escrow-block">
        <span className="mission-meta-label">
          <ShieldCheck size={14} /> Escrow simule
        </span>
        <div className="mission-escrow-steps">
          {escrowSteps.map((step) => (
            <div
              className={`mission-escrow-step ${step.done ? 'is-done' : ''} ${step.active ? 'is-active' : ''}`}
              key={step.key}
            >
              <span></span>
              <p>{step.label}</p>
            </div>
          ))}
        </div>
        {escrowBlockedForFreelancer && (
          <p className="mission-escrow-helper">
            La mission demarre apres blocage du paiement simule par le client.
          </p>
        )}
        {role === 'client' && escrowNeedsFunding && (
          <p className="mission-escrow-helper">
            Confirmez le paiement simule pour bloquer les fonds virtuels avant l execution.
          </p>
        )}
      </div>

      {(order.milestones || []).length > 0 && (
        <div className="mission-milestone-block">
          <span className="mission-meta-label">
            <GitBranch size={14} /> Jalons
          </span>
          <div className="mission-milestone-list">
            {order.milestones.map((milestone, index) => {
              const milestoneMeta = getMilestoneStatusMeta(milestone.status);
              const timerMeta = getMilestoneTimerMeta(milestone);
              const isClientValidatedMilestone =
                /livraison|validation/i.test(milestone.title || '') || index === order.milestones.length - 1;
              const canStartMilestone = canFreelancerManage && milestone.status === 'PENDING';
              const canCompleteMilestone =
                canFreelancerManage
                && !isClientValidatedMilestone
                && ['IN_PROGRESS', 'WAITING_CLIENT'].includes(milestone.status);
              const isSavingMilestone = savingMilestoneId === milestone.id;

              return (
                <div className="mission-milestone-item" key={milestone.id || `${order.id}-${milestone.sortOrder}`}>
                  <div className="mission-milestone-copy">
                    <strong>{milestone.title}</strong>
                    <span>{formatPlanningDate(milestone.deadline)}</span>
                    <span className={`mission-milestone-timer ${timerMeta.tone}`}>
                      <Clock3 size={12} /> {timerMeta.label}
                    </span>
                    {canFreelancerManage && onMilestoneUpdate && (canStartMilestone || canCompleteMilestone) && (
                      <div className="mission-milestone-actions">
                        {canStartMilestone && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-xs"
                            onClick={() => onMilestoneUpdate(order, milestone, 'IN_PROGRESS')}
                            disabled={isSavingMilestone}
                          >
                            <PlayCircle size={13} /> Demarrer
                          </button>
                        )}
                        {canCompleteMilestone && (
                          <button
                            type="button"
                            className="btn btn-accept btn-xs"
                            onClick={() => onMilestoneUpdate(order, milestone, 'COMPLETED')}
                            disabled={isSavingMilestone}
                          >
                            <TimerReset size={13} /> Terminer
                          </button>
                        )}
                      </div>
                    )}
                    {canFreelancerManage && isClientValidatedMilestone && milestone.status === 'WAITING_CLIENT' && (
                      <span className="mission-milestone-helper">Validation finale par le client</span>
                    )}
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
          <p>
            {order.deliveryNote
              || (hasDeliveryFile
                ? 'Livraison partagee via les fichiers joints ci-dessous.'
                : order.deliveredAt
                  ? 'Livraison initiale partagee.'
                  : 'Aucune livraison n a encore ete partagee.')}
          </p>
          {order.deliveredAt && <p>Livree le : {formatOrderDate(order.deliveredAt)}</p>}
          <AttachmentList attachments={deliveryAttachments} compact />
        </div>
        <div className="mission-report-block">
          <span className="mission-meta-label">
            <FileText size={14} /> Suivi ou compte-rendu
          </span>
          <p>{trackingMessage}</p>
          {order.notes && order.revisionRequest && <p>Revision : {order.revisionRequest}</p>}
          <p>Revisions : {revisionCount} / {maxRevisionRounds}</p>
          <AttachmentList attachments={trackingAttachments} compact />
        </div>
      </div>

      {order.disputeReason && (
        <div className="mission-dispute-block">
          <span className="mission-meta-label">
            <AlertTriangle size={14} /> Litige
          </span>
          <p>{order.disputeReason}</p>
          {order.disputeOpenedAt && <p>Ouvert le : {formatOrderDate(order.disputeOpenedAt)}</p>}
          {order.disputeOpenedByEmail && <p>Ouvert par : {order.disputeOpenedByEmail}</p>}
          {order.disputeAdminNotes && <p>Arbitrage admin : {order.disputeAdminNotes}</p>}
          {order.disputeResolution && <p>Decision : {order.disputeResolution}</p>}
        </div>
      )}

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
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => void downloadMissionReport(order)}>
          <Download size={14} /> Telecharger le compte-rendu
        </button>

        {onMessage && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => onMessage(order)}>
            <MessageSquare size={14} /> {role === 'freelancer' ? 'Message client' : 'Message freelance'}
          </button>
        )}

        {canConfirmEscrow && (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => onConfirmEscrow(order)}
            disabled={confirmingEscrow}
          >
            <LockKeyhole size={14} /> {confirmingEscrow ? 'Blocage...' : 'Bloquer paiement simule'}
          </button>
        )}

        {canClientReviewDelivery && (
          <>
            <button
              type="button"
              className="btn btn-accept btn-sm"
              onClick={() => onAcceptDelivery(order)}
              disabled={!canClientAcceptDelivery}
              title={canClientAcceptDelivery ? undefined : 'Bloquez d abord le paiement simule'}
            >
              <CheckCircle2 size={14} /> Valider la livraison
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onRequestRevision(order)}
              disabled={!canClientRequestRevision}
              title={
                canClientRequestRevision
                  ? undefined
                  : escrowSecured
                  ? 'Nombre maximum de revisions atteint'
                  : 'Bloquez d abord le paiement simule'
              }
            >
              <RotateCcw size={14} /> {canClientRequestRevision ? 'Demander revision' : 'Revision indisponible'}
            </button>
          </>
        )}

        {canFreelancerManage && (
          <button type="button" className="btn btn-primary btn-sm" onClick={() => onManage(order)}>
            <PackageCheck size={14} /> Mettre a jour le suivi
          </button>
        )}

        {canOpenDispute && (
          <button type="button" className="btn btn-refuse btn-sm" onClick={() => onOpenDispute(order)}>
            <AlertTriangle size={14} /> Ouvrir litige
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
