import { useId } from 'react';
import { Paperclip, X } from 'lucide-react';
import { ATTACHMENT_ACCEPT, formatFileSize } from '@/utils/attachments';

export default function AttachmentPicker({
  files = [],
  onChange,
  buttonLabel = 'Ajouter des fichiers',
  disabled = false,
  compact = false,
  iconOnly = false,
  showSelectedList = true,
}) {
  const inputId = useId();

  const handleSelect = (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (!selectedFiles.length) {
      return;
    }
    onChange([...files, ...selectedFiles].slice(0, 5));
    event.target.value = '';
  };

  const handleRemove = (index) => {
    onChange(files.filter((_, fileIndex) => fileIndex !== index));
  };

  return (
    <div className={`attachment-picker ${compact ? 'is-compact' : ''}`}>
      <label
        className={`attachment-picker-button ${iconOnly ? 'is-icon-only' : ''} ${disabled ? 'is-disabled' : ''}`}
        htmlFor={inputId}
        aria-label={buttonLabel}
      >
        <Paperclip size={16} />
        <span className={iconOnly ? 'sr-only' : undefined}>{buttonLabel}</span>
      </label>
      <input
        id={inputId}
        className="sr-only"
        type="file"
        multiple
        accept={ATTACHMENT_ACCEPT}
        disabled={disabled}
        onChange={handleSelect}
      />

      {showSelectedList && files.length > 0 && (
        <div className="attachment-selected-list">
          {files.map((file, index) => (
            <span className="attachment-selected-item" key={`${file.name}-${file.size}-${index}`}>
              <span>{file.name}</span>
              <small>{formatFileSize(file.size)}</small>
              <button type="button" onClick={() => handleRemove(index)} disabled={disabled} aria-label="Retirer">
                <X size={13} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
