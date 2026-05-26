import { Download, FileImage, FileText, PackageCheck, Paperclip, Receipt } from 'lucide-react';
import { formatFileSize, getAttachmentTypeLabel } from '@/utils/attachments';

const getIcon = (attachment) => {
  if (attachment.contentType?.startsWith('image/')) return FileImage;
  if (attachment.attachmentType === 'INVOICE') return Receipt;
  if (attachment.attachmentType === 'DELIVERY_PROOF') return PackageCheck;
  if (attachment.attachmentType === 'REVISION_FILE') return FileText;
  if (attachment.contentType === 'application/pdf' || attachment.attachmentType === 'PDF') return FileText;
  return Paperclip;
};

export default function AttachmentList({ attachments = [], compact = false }) {
  if (!attachments.length) {
    return null;
  }

  return (
    <div className={`attachment-list ${compact ? 'is-compact' : ''}`}>
      {attachments.map((attachment) => {
        const Icon = getIcon(attachment);
        return (
          <a
            key={attachment.id || attachment.fileUrl}
            className="attachment-item"
            href={attachment.fileUrl}
            target="_blank"
            rel="noreferrer"
          >
            <span className="attachment-icon">
              <Icon size={16} />
            </span>
            <span className="attachment-content">
              <span className="attachment-name">{attachment.originalFileName || 'Piece jointe'}</span>
              <span className="attachment-meta">
                {getAttachmentTypeLabel(attachment.attachmentType, attachment.contentType)}
                {' - '}
                {formatFileSize(attachment.fileSize)}
              </span>
            </span>
            <Download size={14} className="attachment-download" />
          </a>
        );
      })}
    </div>
  );
}
