'use client';

import { useRef, useState, type DragEvent, type KeyboardEvent, type ReactNode } from 'react';

export function Dropzone({
  onFiles,
  multiple = true,
  disabled = false,
  compact = false,
  children,
}: {
  onFiles: (files: File[]) => void;
  multiple?: boolean;
  disabled?: boolean;
  compact?: boolean;
  children?: ReactNode;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const take = (list: FileList | null) => {
    if (disabled || !list?.length) return;
    const files = Array.from(list);
    onFiles(multiple ? files : files.slice(0, 1));
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    take(e.dataTransfer.files);
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      input.current?.click();
    }
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      className={`dropzone ${dragging ? 'is-dragging' : ''} ${disabled ? 'is-disabled' : ''} ${compact ? 'dropzone-compact' : ''}`}
      onClick={() => !disabled && input.current?.click()}
      onKeyDown={onKey}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <input
        ref={input}
        type="file"
        hidden
        multiple={multiple}
        onChange={(e) => {
          take(e.target.files);
          e.target.value = '';
        }}
      />
      {children ?? (
        <>
          <div className="dz-icon">
            <i className="bi bi-cloud-arrow-up" />
          </div>
          <div className="fw-semibold text-ink">Drop files here or click to browse</div>
          <small className="text-muted">Re-uploading a file with the same name adds a new version.</small>
        </>
      )}
    </div>
  );
}
