export const ATTACHMENT_ACCEPT = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.pdf',
  '.doc',
  '.docx',
].join(',');

export const formatFileSize = (bytes = 0) => {
  if (!bytes) return '0 Ko';
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
};

export const getAttachmentTypeLabel = (type, contentType) => {
  if (type === 'BRIEF') return 'Brief';
  if (type === 'INVOICE') return 'Facture';
  if (type === 'DELIVERY_PROOF') return 'Preuve';
  if (type === 'IMAGE' || contentType?.startsWith('image/')) return 'Image';
  if (type === 'PDF' || contentType === 'application/pdf') return 'PDF';
  if (type === 'DOCUMENT') return 'Document';
  return 'Fichier';
};
