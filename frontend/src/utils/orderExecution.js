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

export function downloadMissionReport(order, role) {
  const counterpartLabel = role === 'freelancer' ? 'Client' : 'Freelance';
  const counterpartValue = role === 'freelancer' ? order.clientEmail : order.freelancerEmail || `#${order.freelancerId}`;
  const statusMeta = getOrderStatusMeta(order.status);
  const paymentMeta = getPaymentStatusMeta(order.paymentStatus);
  const milestoneLines = (order.milestones || [])
    .map((milestone) => `- ${milestone.title}: ${getMilestoneStatusMeta(milestone.status).label}`)
    .join('\n');
  const activityLines = (order.activities || [])
    .map((activity) => `- ${formatOrderDate(activity.createdAt)}: ${activity.title}${activity.details ? ` (${activity.details})` : ''}`)
    .join('\n');

  const content = [
    `Compte-rendu de mission - ${order.serviceTitle}`,
    '',
    `Commande: #${order.id}`,
    `${counterpartLabel}: ${counterpartValue}`,
    `Montant: ${order.amount} MAD`,
    `Statut: ${statusMeta.label}`,
    `Progression: ${getMissionProgress(order)}%`,
    `Paiement: ${paymentMeta.label}`,
    `Creee le: ${formatOrderDate(order.createdAt)}`,
    `Derniere mise a jour: ${formatOrderDate(order.updatedAt || order.createdAt)}`,
    `Debut: ${formatPlanningDate(order.startDate)}`,
    `Echeance: ${formatPlanningDate(order.dueDate)}`,
    `Fin: ${formatPlanningDate(order.endDate)}`,
    '',
    'Brief initial:',
    order.requestMessage || 'Aucun brief initial partage.',
    '',
    'Jalons:',
    milestoneLines || 'Aucun jalon renseigne.',
    '',
    'Livraison:',
    order.deliveryNote || 'Aucune livraison partagee.',
    '',
    'Demande de revision:',
    order.revisionRequest || 'Aucune demande de revision.',
    '',
    'Timeline:',
    activityLines || 'Aucune activite enregistree.',
    '',
    'Suivi ou compte-rendu:',
    order.notes || 'Aucun suivi n a encore ete partage.',
  ].join('\n');

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `mission-${order.id}.txt`;
  link.click();
  window.URL.revokeObjectURL(url);
}
