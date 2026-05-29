import { getMissionReportPdf } from '@/api/orderApi';

export const activeMissionStatuses = ['ACCEPTED', 'IN_PROGRESS', 'WAITING_CLIENT', 'DELIVERED', 'REVISION'];

export function getOrderStatusMeta(status) {
  switch (status) {
    case 'ACCEPTED':
      return { label: 'Validee', badgeClass: 'badge-primary', progress: 15, tone: 'is-pending' };
    case 'IN_PROGRESS':
      return { label: 'En cours', badgeClass: 'badge-primary', progress: 60, tone: 'is-active' };
    case 'WAITING_CLIENT':
      return { label: 'Attente client', badgeClass: 'badge-warning', progress: 75, tone: 'is-active' };
    case 'DELIVERED':
      return { label: 'Livree', badgeClass: 'badge-warning', progress: 90, tone: 'is-active' };
    case 'REVISION':
      return { label: 'Revision', badgeClass: 'badge-warning', progress: 80, tone: 'is-active' };
    case 'COMPLETED':
      return { label: 'Terminee', badgeClass: 'badge-success', progress: 100, tone: 'is-complete' };
    case 'CANCELLED':
      return { label: 'Annulee', badgeClass: 'badge-warning', progress: 100, tone: 'is-cancelled' };
    case 'DISPUTED':
      return { label: 'Litige', badgeClass: 'badge-warning', progress: 50, tone: 'is-cancelled' };
    default:
      return { label: 'En attente', badgeClass: 'badge-warning', progress: 5, tone: 'is-pending' };
  }
}

export function getPaymentStatusMeta(status) {
  switch (status) {
    case 'HELD':
      return { label: 'Paiement bloque', badgeClass: 'badge-warning' };
    case 'RELEASED':
      return { label: 'Paiement libere', badgeClass: 'badge-success' };
    case 'PENDING':
      return { label: 'Paiement en attente', badgeClass: 'badge-warning' };
    case 'PAID':
      return { label: 'Paiement libere', badgeClass: 'badge-success' };
    case 'REFUNDED':
      return { label: 'Rembourse', badgeClass: 'badge-warning' };
    default:
      return { label: 'Non paye', badgeClass: 'badge-primary' };
  }
}

export function isEscrowActionable(status) {
  return ['UNPAID', 'PENDING'].includes(status);
}

export function isEscrowSecured(status) {
  return ['HELD', 'PAID', 'RELEASED'].includes(status);
}

export function getEscrowSteps(order) {
  const paymentStatus = order?.paymentStatus;
  const orderStatus = order?.status;
  const hasDelivery = ['DELIVERED', 'REVISION', 'COMPLETED'].includes(orderStatus)
    || Boolean(order?.deliveryNote)
    || Boolean(order?.deliveredAt)
    || hasDeliveryAttachment(order);

  return [
    {
      key: 'pending',
      label: 'Paiement en attente',
      done: ['PENDING', 'HELD', 'PAID', 'RELEASED', 'REFUNDED'].includes(paymentStatus),
      active: isEscrowActionable(paymentStatus),
    },
    {
      key: 'held',
      label: 'Fonds virtuels bloques',
      done: isEscrowSecured(paymentStatus) || paymentStatus === 'REFUNDED',
      active: paymentStatus === 'HELD',
    },
    {
      key: 'delivered',
      label: 'Mission livree',
      done: hasDelivery,
      active: hasDelivery && paymentStatus === 'HELD',
    },
    {
      key: 'released',
      label: paymentStatus === 'REFUNDED' ? 'Paiement rembourse' : 'Paiement libere',
      done: ['PAID', 'RELEASED', 'REFUNDED'].includes(paymentStatus),
      active: ['PAID', 'RELEASED', 'REFUNDED'].includes(paymentStatus),
    },
  ];
}

export function hasDeliveryAttachment(order) {
  return (order?.attachments || []).some((attachment) => attachment.attachmentType === 'DELIVERY_PROOF');
}

function isClientReviewEvidenceAttachment(attachment) {
  return ['DELIVERY_PROOF', 'REVISION_FILE'].includes(attachment?.attachmentType);
}

function toTimestamp(value) {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function getLatestActivityTimestamp(order, type) {
  return Math.max(
    0,
    ...(order?.activities || [])
      .filter((activity) => activity.type === type)
      .map((activity) => toTimestamp(activity.createdAt) || 0),
  );
}

function hasFreshDeliveryAfterLatestRevision(order) {
  const latestRevisionAt = getLatestActivityTimestamp(order, 'REVISION_REQUESTED');
  if (!latestRevisionAt) {
    return Boolean(order.deliveryNote)
      || Boolean(order.deliveredAt)
      || (order.attachments || []).some(isClientReviewEvidenceAttachment);
  }

  const deliveredAt = toTimestamp(order.deliveredAt);
  const updatedAt = toTimestamp(order.updatedAt);
  const latestDeliveryActivityAt = getLatestActivityTimestamp(order, 'DELIVERY_SUBMITTED');
  const deliveryAttachmentTimestamps = (order.attachments || [])
    .filter(isClientReviewEvidenceAttachment)
    .map((attachment) => toTimestamp(attachment.createdAt));
  const latestDeliveryAttachmentAt = Math.max(0, ...deliveryAttachmentTimestamps.map((timestamp) => timestamp || 0));
  const hasDeliveryAttachmentWithoutDate = deliveryAttachmentTimestamps.some((timestamp) => !timestamp);
  const hasUpdatedDeliveryNoteAfterRevision = Boolean(order.deliveryNote) && updatedAt && updatedAt >= latestRevisionAt;

  return [deliveredAt, latestDeliveryActivityAt, latestDeliveryAttachmentAt]
    .some((timestamp) => timestamp && timestamp >= latestRevisionAt)
    || hasUpdatedDeliveryNoteAfterRevision
    || hasDeliveryAttachmentWithoutDate;
}

export function hasClientReviewableDelivery(order) {
  if (!order || ['COMPLETED', 'CANCELLED', 'DISPUTED'].includes(order.status)) {
    return false;
  }

  if (['DELIVERED', 'WAITING_CLIENT'].includes(order.status)) {
    return true;
  }

  if (order.status === 'REVISION') {
    return hasFreshDeliveryAfterLatestRevision(order);
  }

  const hasDeliveryEvidence = Boolean(order.deliveryNote) || Boolean(order.deliveredAt) || hasDeliveryAttachment(order);
  const hasWaitingClientMilestone = (order.milestones || []).some((milestone, index, milestones) => {
    const title = milestone.title || '';
    const isDeliveryMilestone = /livraison|validation/i.test(title) || index === milestones.length - 1;
    return isDeliveryMilestone && milestone.status === 'WAITING_CLIENT';
  });

  return hasDeliveryEvidence || hasWaitingClientMilestone;
}

export function getMissionProgress(order) {
  const explicitProgress = Number(order?.progressPercentage);
  if (Number.isFinite(explicitProgress)) {
    return Math.min(100, Math.max(0, explicitProgress));
  }
  return getOrderStatusMeta(order?.status).progress;
}

export function getMilestoneStatusMeta(status) {
  switch (status) {
    case 'IN_PROGRESS':
      return { label: 'En cours', className: 'is-active' };
    case 'WAITING_CLIENT':
      return { label: 'Attente client', className: 'is-waiting' };
    case 'COMPLETED':
      return { label: 'Termine', className: 'is-done' };
    case 'CANCELLED':
      return { label: 'Annule', className: 'is-cancelled' };
    default:
      return { label: 'A faire', className: 'is-pending' };
  }
}

export function formatTimerDuration(totalMinutes) {
  const safeMinutes = Math.max(0, Number(totalMinutes) || 0);
  const days = Math.floor(safeMinutes / (60 * 24));
  const hours = Math.floor((safeMinutes % (60 * 24)) / 60);
  const minutes = safeMinutes % 60;

  if (days > 0) {
    return `${days}j ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  return `${minutes}min`;
}

export function getMilestoneTimerMeta(milestone) {
  if (!milestone) {
    return { label: 'Timer non defini', tone: 'is-pending' };
  }

  if (milestone.status === 'COMPLETED') {
    if (milestone.timerStartedAt && milestone.timerCompletedAt) {
      const elapsedMinutes = Math.max(
        0,
        Math.round((new Date(milestone.timerCompletedAt) - new Date(milestone.timerStartedAt)) / 60000),
      );
      return { label: `Terminee en ${formatTimerDuration(elapsedMinutes)}`, tone: 'is-done' };
    }
    return { label: 'Phase terminee', tone: 'is-done' };
  }

  if (!milestone.timerStartedAt) {
    if (milestone.timerDurationMinutes) {
      return { label: `Prevu: ${formatTimerDuration(milestone.timerDurationMinutes)}`, tone: 'is-pending' };
    }
    if (milestone.deadline) {
      return { label: `Avant le ${formatPlanningDate(milestone.deadline)}`, tone: 'is-pending' };
    }
    return { label: 'Timer non defini', tone: 'is-pending' };
  }

  const startedAt = new Date(milestone.timerStartedAt);
  const targetDate = milestone.timerDurationMinutes
    ? new Date(startedAt.getTime() + Number(milestone.timerDurationMinutes) * 60000)
    : milestone.deadline
      ? new Date(`${milestone.deadline}T23:59:59`)
      : null;

  if (!targetDate) {
    return { label: 'Timer en cours', tone: 'is-active' };
  }

  const diffMinutes = Math.ceil((targetDate - new Date()) / 60000);
  if (diffMinutes <= 0) {
    return { label: 'Temps depasse', tone: 'is-overdue' };
  }

  return { label: `${formatTimerDuration(diffMinutes)} restantes`, tone: 'is-active' };
}

export function getMissionChecklist(order) {
  const status = order.status;
  const hasStarted = ['IN_PROGRESS', 'WAITING_CLIENT', 'DELIVERED', 'REVISION', 'COMPLETED'].includes(status);
  const hasDelivery = ['DELIVERED', 'REVISION', 'COMPLETED'].includes(status) || Boolean(order.deliveryNote);
  const hasClientFeedback = ['REVISION', 'COMPLETED'].includes(status);

  return [
    { key: 'validated', label: 'Mission validee', done: ['ACCEPTED', ...activeMissionStatuses, 'COMPLETED'].includes(status) },
    { key: 'running', label: 'Execution en cours', done: hasStarted && !['CANCELLED', 'DISPUTED'].includes(status) },
    { key: 'delivery', label: 'Livraison partagee', done: hasDelivery },
    { key: 'client', label: 'Validation client', done: hasClientFeedback },
    { key: 'closed', label: 'Cloture finale', done: status === 'COMPLETED' },
  ];
}

export function formatOrderDate(value) {
  if (!value) {
    return 'A confirmer';
  }

  return new Date(value).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatPlanningDate(value) {
  if (!value) {
    return 'A confirmer';
  }

  return new Date(`${value}T00:00:00`).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export async function downloadMissionReport(order) {
  try {
    const response = await getMissionReportPdf(order.id);
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `rapport-mission-${order.id}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    throw new Error(await resolveDownloadErrorMessage(error));
  }
}

async function resolveDownloadErrorMessage(error) {
  const fallbackMessage = 'Impossible de telecharger le rapport PDF.';
  const data = error.response?.data;

  if (data instanceof Blob) {
    try {
      const text = await data.text();
      const parsed = JSON.parse(text);
      return parsed.message || parsed.details || fallbackMessage;
    } catch {
      return fallbackMessage;
    }
  }

  return data?.message || data?.details || fallbackMessage;
}
