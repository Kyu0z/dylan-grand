import { useId, useRef, useState, type DragEvent, type ReactNode } from 'react';
import { L } from '../lib/domain';
import {
  IMAGE_ACCEPT,
  MAX_ROOM_IMAGES,
  moveImage,
  validateImageFiles,
  type ImageValidationError,
} from '../lib/image-upload';
import { useLocale } from '../lib/locale';
import './image-upload.css';

type UploadIconName = 'camera' | 'image' | 'crown' | 'grip' | 'trash';

function UploadIcon({ name, size = 18 }: { name: UploadIconName; size?: number; }) {
  const paths: Record<UploadIconName, ReactNode> = {
    camera: (
      <>
        <path d="M3 7h4l2-3h6l2 3h4a1 1 0 0 1 1 1v12H2V8a1 1 0 0 1 1-1Z" />
        <circle cx="12" cy="13" r="4" />
      </>
    ),
    image: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="9" cy="9" r="1.5" />
        <path d="m21 16-5-5L5 21" />
      </>
    ),
    crown: <path d="m3 5 4 4 5-6 5 6 4-4-2 12H5L3 5Zm2 15h14" />,
    grip: (
      <>
        {[6, 12, 18].map(y => (
          <g key={y} fill="currentColor" stroke="none">
            <circle cx="9" cy={y} r="1.6" />
            <circle cx="15" cy={y} r="1.6" />
          </g>
        ))}
      </>
    ),
    trash: (
      <>
        <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7" />
      </>
    ),
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

type ImageUploadProps = {
  label?: ReactNode;
  images: readonly string[];
  onFiles: (files: File[]) => Promise<void>;
  onImagesChange: (images: string[]) => void;
  onInvalid?: (message: string) => void;
  busy?: boolean;
  multiple?: boolean;
  limit?: number;
  accept?: string;
  help?: ReactNode;
};

type UploadError = ImageValidationError | 'read';

export function ImageUpload({
  label,
  images,
  onFiles,
  onImagesChange,
  onInvalid,
  busy = false,
  multiple = true,
  limit = multiple ? MAX_ROOM_IMAGES : 1,
  accept = IMAGE_ACCEPT,
  help,
}: ImageUploadProps) {
  const { t } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const processing = useRef(false);
  const dragDepth = useRef(0);
  const dragIndex = useRef<number | null>(null);
  const labelId = useId();
  const helpId = useId();
  const reorderId = useId();
  const [pending, setPending] = useState(false);
  const [overFiles, setOverFiles] = useState(false);
  const [target, setTarget] = useState<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [error, setError] = useState<UploadError | null>(null);
  const disabled = busy || pending;
  const full = multiple && images.length >= limit;
  const canAdd = !disabled && !full;
  const canReorder = multiple && !disabled && images.length > 1;
  const messages: Record<UploadError, string> = {
    count: t(L(`Maximum ${limit} photos.`, `Tối đa ${limit} ảnh.`)),
    format: t(L('Only JPEG, PNG and WebP images are allowed.', 'Chỉ chấp nhận ảnh JPEG, PNG và WebP.')),
    size: t(L('Choose non-empty images up to 5 MB each.', 'Chọn ảnh không rỗng, tối đa 5 MB/ảnh.')),
    read: t(L('Image could not be read or uploaded. Please try again.', 'Không thể đọc hoặc tải ảnh. Vui lòng thử lại.')),
  };

  const report = (next: UploadError) => {
    setError(next);
    onInvalid?.(messages[next]);
  };

  const addFiles = async (files: File[]) => {
    if (busy || processing.current || !files.length) return;
    const invalid = validateImageFiles(files, multiple ? images.length : 0, limit);
    if (invalid) {
      report(invalid);
      return;
    }

    setError(null);
    processing.current = true;
    setPending(true);
    try {
      await onFiles(files);
    } catch {
      // The API client already emits its own error toast. Keep a visible inline error too.
      setError('read');
    } finally {
      processing.current = false;
      setPending(false);
    }
  };

  const resetDrag = () => {
    dragIndex.current = null;
    setDragging(null);
    setTarget(null);
  };

  const reorder = (from: number, to: number) => {
    if (!canReorder || processing.current || from === to) return;
    onImagesChange(moveImage(images, from, to));
  };

  const isFileDrag = (event: DragEvent) =>
    Array.from(event.dataTransfer.types).includes('Files');

  const actionLabel = pending
    ? t(L('Uploading images…', 'Đang tải ảnh lên…'))
    : full
      ? t(L('Photo limit reached', 'Đã đạt giới hạn ảnh'))
      : !multiple && images.length
        ? t(L('Replace image', 'Thay ảnh'))
        : multiple
          ? t(L('Add room images', 'Thêm ảnh phòng'))
          : t(L('Add image', 'Thêm ảnh'));

  return (
    <div
      className="form-field image-uploader"
      aria-busy={disabled}
      onDragOver={event => {
        if (isFileDrag(event)) event.preventDefault();
      }}
      onDrop={event => {
        // Do not allow a dropped file outside the upload zone to navigate the browser.
        if (isFileDrag(event)) event.preventDefault();
      }}
    >
      <div className="image-uploader-heading">
        <span className="form-label image-uploader-label" id={labelId}>
          <UploadIcon name="image" size={19} />
          {label ?? t(L('Photos', 'Hình ảnh'))}
        </span>
        {multiple && (
          <span className="image-uploader-count">
            {images.length}/{limit} {t(L('photos', 'ảnh'))}
          </span>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={!canAdd}
        hidden
        tabIndex={-1}
        onChange={event => {
          const files = Array.from<File>(event.currentTarget.files ?? []);
          event.currentTarget.value = '';
          void addFiles(files);
        }}
      />
      <button
        type="button"
        className={`image-dropzone${overFiles ? ' is-dragover' : ''}`}
        disabled={!canAdd}
        aria-describedby={helpId}
        onClick={() => inputRef.current?.click()}
        onDragEnter={event => {
          if (!isFileDrag(event)) return;
          event.preventDefault();
          if (!canAdd) return;
          dragDepth.current += 1;
          setOverFiles(true);
        }}
        onDragOver={event => {
          if (!isFileDrag(event)) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = canAdd ? 'copy' : 'none';
        }}
        onDragLeave={() => {
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (!dragDepth.current) setOverFiles(false);
        }}
        onDrop={event => {
          event.preventDefault();
          event.stopPropagation();
          dragDepth.current = 0;
          setOverFiles(false);
          if (!disabled && isFileDrag(event)) {
            void addFiles(Array.from<File>(event.dataTransfer.files));
          }
        }}
      >
        <span className="image-dropzone-action">
          {pending ? <span className="image-upload-spinner" /> : <UploadIcon name="camera" size={25} />}
          {actionLabel}
        </span>
        <span id={helpId} className="image-dropzone-hint">
          {t(L('JPEG, PNG or WebP · Max 5 MB each', 'JPEG, PNG hoặc WebP · Tối đa 5 MB/ảnh'))}
          {canAdd && ` · ${t(L('Click or drag and drop', 'Nhấn hoặc kéo thả'))}`}
        </span>
      </button>
      {error && <span className="image-upload-error" role="alert">{messages[error]}</span>}
      {pending && <span className="image-upload-sr-only" role="status">{actionLabel}</span>}

      {multiple && images.length > 1 && (
        <span id={reorderId} className="image-reorder-hint">
          {t(L('Drag the handle to reorder. Click it to set the cover, or use arrow keys.', 'Kéo tay nắm để đổi thứ tự. Nhấn để đặt ảnh bìa hoặc dùng phím mũi tên.'))}
        </span>
      )}
      {!!images.length && (
        <div className={`image-upload-grid${multiple ? '' : ' is-single'}`} role="group" aria-labelledby={labelId}>
          {images.map((url, index) => {
            const cover = multiple && index === 0;
            const photoLabel = t(L(`Photo ${index + 1}`, `Ảnh ${index + 1}`));
            return (
              <div
                className={`image-upload-item${target === index ? ' is-drop-target' : ''}${dragging === index ? ' is-dragging' : ''}`}
                key={`${url}-${images.slice(0, index).filter(item => item === url).length}`}
                onDragOver={event => {
                  if (dragIndex.current === null || !canReorder) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = 'move';
                  setTarget(index);
                }}
                onDragLeave={event => {
                  if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) {
                    setTarget(current => current === index ? null : current);
                  }
                }}
                onDrop={event => {
                  if (dragIndex.current === null) return;
                  event.preventDefault();
                  event.stopPropagation();
                  const from = dragIndex.current;
                  resetDrag();
                  reorder(from, index);
                }}
              >
                <div className="image-upload-preview">
                  <img src={url} alt={photoLabel} draggable={false} />
                  {cover && (
                    <span className="image-cover-badge"><UploadIcon name="crown" size={14} />{t(L('Cover image', 'Ảnh bìa'))}</span>
                  )}
                  {multiple && images.length > 1 && (
                    <button
                      type="button"
                      className="image-drag-handle"
                      disabled={!canReorder}
                      draggable={canReorder}
                      aria-label={`${photoLabel}: ${t(L('Reorder or set as cover', 'Đổi thứ tự hoặc đặt ảnh bìa'))}`}
                      aria-describedby={reorderId}
                      title={t(L('Drag to reorder · Click to set cover', 'Kéo đổi thứ tự · Nhấn đặt ảnh bìa'))}
                      onClick={() => reorder(index, 0)}
                      onKeyDown={event => {
                        const destination = event.key === 'ArrowLeft' || event.key === 'ArrowUp'
                          ? index - 1
                          : event.key === 'ArrowRight' || event.key === 'ArrowDown'
                            ? index + 1
                            : event.key === 'Home'
                              ? 0
                              : event.key === 'End' ? images.length - 1 : null;
                        if (destination === null) return;
                        event.preventDefault();
                        reorder(index, destination);
                      }}
                      onDragStart={event => {
                        if (!canReorder) {
                          event.preventDefault();
                          return;
                        }
                        dragIndex.current = index;
                        event.dataTransfer.effectAllowed = 'move';
                        event.dataTransfer.setData('text/plain', String(index));
                        setDragging(index);
                      }}
                      onDragEnd={resetDrag}
                    >
                      <UploadIcon name="grip" size={21} />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  className="btn btn-secondary image-remove-button"
                  disabled={disabled}
                  aria-label={`${t(L('Remove', 'Xóa ảnh'))} ${photoLabel}`}
                  onClick={() => {
                    if (processing.current) return;
                    setError(null);
                    onImagesChange(images.filter((_, i) => i !== index));
                  }}
                >
                  <UploadIcon name="trash" size={16} />
                  {t(L('Remove', 'Xóa ảnh'))}
                </button>
              </div>
            );
          })}
        </div>
      )}
      {help && <span className="field-help">{help}</span>}
    </div>
  );
}
