export const categoryInitialState = {
  description: '',
  id: null,
  isActive: true,
  name: '',
};

export const notificationInitialState = {
  audience: 'ALL',
  content: '',
};

export function formatAdminDate(value) {
  return value ? new Date(value).toLocaleDateString('fr-FR') : '-';
}

export function formatAdminMoney(value) {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('fr-FR', { currency: 'MAD', style: 'currency' }).format(Number(value));
}

export function getAdminBadgeClass(status) {
  if (['ACTIVE', 'PUBLISHED', 'COMPLETED', 'RESOLVED', 'PAID', 'CLOSED'].includes(status)) return 'badge-success';
  if (['SUSPENDED', 'CANCELLED', 'REJECTED', 'ARCHIVED', 'REVISION', 'DISPUTED', 'REFUNDED', 'ARBITRATED'].includes(status)) return 'badge-warning';
  return 'badge-primary';
}

export function normalizeAdminCategory(category) {
  return {
    ...category,
    isActive: category.isActive ?? category.active ?? false,
  };
}
