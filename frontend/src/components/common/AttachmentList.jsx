import { useState } from 'react';
import { Download, FileImage, FileText, PackageCheck, Paperclip, Receipt } from 'lucide-react';
import { downloadAttachment } from '@/api/attachmentApi';
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
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadError, setDownloadError] = useState('');

  if (!attachments.length) {
    return null;
  }

  const handleDownload = async (attachment) => {
    const attachmentKey = attachment.id || attachment.fileUrl;
    setDownloadError('');
    setDownloadingId(attachmentKey);
    try {
      const response = await downloadAttachment(attachment.fileUrl);
      const blob = new Blob([response.data], {
        type: response.headers['content-type'] || attachment.contentType || 'application/octet-stream',
      });
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = attachment.originalFileName || 'piece-jointe';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
    } catch {
      setDownloadError('Impossible de telecharger cette piece jointe.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className={`attachment-list ${compact ? 'is-compact' : ''}`}>
      {attachments.map((attachment) => {
        const Icon = getIcon(attachment);
        const attachmentKey = attachment.id || attachment.fileUrl;
        const isDownloading = downloadingId === attachmentKey;
        return (
          <button
            key={attachmentKey}
            type="button"
            className="attachment-item"
            onClick={() => handleDownload(attachment)}
            disabled={isDownloading}
            aria-label={`Telecharger ${attachment.originalFileName || 'la piece jointe'}`}
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
          </button>
        );
      })}
      {downloadError && <p className="attachment-error">{downloadError}</p>}
    </div>
  );
}
