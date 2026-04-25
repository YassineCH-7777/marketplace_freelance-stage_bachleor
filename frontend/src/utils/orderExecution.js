export function getOrderStatusMeta(status) {
  switch (status) {
    case 'IN_PROGRESS':
      return { label: 'En cours', badgeClass: 'badge-primary', progress: 60, tone: 'is-active' };
    case 'COMPLETED':
      return { label: 'Terminee', badgeClass: 'badge-success', progress: 100, tone: 'is-complete' };
    case 'CANCELLED':
      return { label: 'Annulee', badgeClass: 'badge-warning', progress: 100, tone: 'is-cancelled' };
    default:
      return { label: 'En attente', badgeClass: 'badge-warning', progress: 25, tone: 'is-pending' };
  }
}

export function getMissionChecklist(order) {
  const hasStarted = ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(order.status);
  const hasProof = Boolean(order.notes);

  return [
    { key: 'validated', label: 'Mission validee', done: hasStarted },
    { key: 'running', label: 'Execution en cours', done: hasStarted && order.status !== 'CANCELLED' },
    { key: 'proof', label: 'Preuve ou compte-rendu partage', done: hasProof },
    { key: 'closed', label: 'Cloture finale', done: order.status === 'COMPLETED' },
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
  const content = [
    `Compte-rendu de mission - ${order.serviceTitle}`,
    '',
    `Commande: #${order.id}`,
    `${counterpartLabel}: ${counterpartValue}`,
    `Montant: ${order.amount} MAD`,
    `Statut: ${statusMeta.label}`,
    `Creee le: ${formatOrderDate(order.createdAt)}`,
    `Derniere mise a jour: ${formatOrderDate(order.updatedAt || order.createdAt)}`,
    `Debut: ${formatPlanningDate(order.startDate)}`,
    `Fin: ${formatPlanningDate(order.endDate)}`,
    '',
    'Brief initial:',
    order.requestMessage || 'Aucun brief initial partage.',
    '',
    'Suivi, preuve de livraison ou compte-rendu final:',
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
