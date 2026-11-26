import { PickerFooter } from './picker-footer';
import { fieldPlaceholder } from '../lib/field-placeholder';
import { calendarCells, calendarIso, displayPickerValue, hotelNow, parseCalendarDate, pickerValueInRange, popupPosition, validPickerValue } from '../lib/date-picker';
import { useEffect, useId, useLayoutEffect, useRef, useState, type ButtonHTMLAttributes, type ChangeEvent, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes, } from 'react';
import { createPortal } from 'react-dom';
import { ImageUpload } from './image-upload';
import { IMAGE_ACCEPT, readImageFile } from '../lib/image-upload';
import { useLocale } from '../lib/locale';
import { L, formatMoney, type Language } from '../lib/domain';
const paths: Record<string, ReactNode> = {
  grid: <>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </>,
  hotel: <>
    <path d="M4 21V5l8-3 8 3v16M2 21h20M9 21v-5h6v5M8 7h1m6 0h1M8 11h1m6 0h1" />
  </>,
  bed: <>
    <path d="M3 18v-7m18 7v-7M3 14h18M5 14v-4h14v4M6 10V7h5v3m2 0V7h5v3" />
  </>,
  door: <>
    <rect x="5" y="2" width="14" height="20" rx="1" />
    <circle cx="15" cy="12" r="1" />
  </>,
  calendar: <>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M7 3v4m10-4v4M3 10h18" />
  </>,
  tag: <>
    <path d="M3 4h8l10 10-7 7L3 10V4Z" />
    <circle cx="8" cy="8" r="1" />
  </>,
  clipboard: <>
    <rect x="5" y="4" width="14" height="18" rx="2" />
    <path d="M9 4V2h6v2M9 11h6M9 15h6" />
  </>,
  lock: <>
    <rect x="5" y="10" width="14" height="11" rx="2" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
  </>,
  mail: <>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </>,
  key: <>
    <circle cx="8" cy="15" r="5" />
    <path d="m12 11 9-9m-4 4 3 3M14 9l3 3" />
  </>,
  wallet: <>
    <rect x="2" y="5" width="20" height="16" rx="2" />
    <path d="M2 9h20m-5 5h1" />
  </>,
  sparkles: <>
    <path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3Z" />
  </>,
  users: <>
    <circle cx="9" cy="8" r="4" />
    <path d="M2 21v-2a7 7 0 0 1 14 0v2M17 4a4 4 0 0 1 0 8m1 5c2 1 3 2 3 4" />
  </>,
  percent: <>
    <path d="m4 20 16-16" />
    <circle cx="7" cy="7" r="3" />
    <circle cx="17" cy="17" r="3" />
  </>,
  shield: <>
    <path d="m12 2 8 4v6c0 6-4 9-8 10-4-1-8-4-8-10V6l8-4Z" />
    <path d="m9 12 2 2 4-4" />
  </>,
  chart: <>
    <path d="M3 3v18h18M7 17v-5m5 5V7m5 10v-9" />
  </>,
  search: <>
    <circle cx="10" cy="10" r="7" />
    <path d="m15 15 6 6" />
  </>,
  bell: <>
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
  </>,
  moon: <path d="M20 15a8 8 0 0 1-11-11A9 9 0 1 0 20 15Z" />,
  sun: <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M19 5l-2 2M7 17l-2 2" />
  </>,
  chevron: <path d="m9 18 6-6-6-6" />,
  down: <path d="m6 9 6 6 6-6" />,
  plus: <path d="M12 5v14m-7-7h14" />,
  arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  left: <path d="m15 18-6-6 6-6" />,
  right: <path d="m9 18 6-6-6-6" />,
  up: <path d="m7 14 5-5 5 5" />,
  check: <path d="m4 12 5 5L20 6" />,
  close: <path d="M5 5l14 14M19 5 5 19" />,
  edit: <>
    <path d="m4 17 12-12 3 3-12 12H4v-3Z" />
    <path d="m14 7 3 3" />
  </>,
  dots: <>
    <circle cx="5" cy="12" r="1" />
    <circle cx="12" cy="12" r="1" />
    <circle cx="19" cy="12" r="1" />
  </>,
  download: <>
    <path d="M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4" />
  </>,
  filter: <>
    <path d="M4 6h16M7 12h10m-7 6h4" />
  </>,
  info: <>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 10v6m0-10v1" />
  </>,
  refresh: <>
    <path d="M20 7v5h-5M4 17v-5h5" />
    <path d="M5 9a8 8 0 0 1 13-3l2 6M4 12l2 6a8 8 0 0 0 13-3" />
  </>,
  logout: <>
    <path d="M10 3H5v18h5m5-4 5-5-5-5m5 5H9" />
  </>,
  clock: <>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </>,
  external: <>
    <path d="M12 4h8v8M20 4l-9 9M18 14v6H4V6h6" />
  </>,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  star: <path d="m12 2 3 7 7 .6-5.3 4.8 1.6 7.1-6.3-3.7-6.3 3.7 1.6-7.1L2 9.6 9 9l3-7Z" />,
  upload: <>
    <path d="M12 16V5m0 0-4 4m4-4 4 4" />
    <path d="M5 16v3h14v-3" />
  </>,
  trash: <>
    <path d="M4 7h16M9 7V4h6v3M8 7l1 13h6l1-13" />
  </>,
  image: <>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <circle cx="9" cy="10" r="1.6" />
    <path d="m21 15-4.5-4.5L8 19" />
  </>,
};
export function Icon({ name, size = 18, className = '' }: {
  name: string;
  size?: number;
  className?: string;
}) {
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {paths[name] ?? paths.grid}
  </svg>;
}
export function Button({ children, variant = 'primary', icon, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: string;
}) {
  return <button {...props} className={`btn btn-${variant} ${props.className ?? ''}`}>
    {icon && <Icon name={icon} size={15} />}
    <span>
      {children}
    </span>
  </button>;
}
export function Badge({ children, tone = 'neutral' }: {
  children: ReactNode;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'gold';
}) {
  return <span className={`status-badge badge-${tone}`}>
    <span className="status-dot" />
    {children}
  </span>;
}
const statusTranslations: Record<string, string> = {
  Pending: 'Đang chờ',
  Confirmed: 'Đã xác nhận',
  'Checked-in': 'Đã nhận phòng',
  'Checked-out': 'Đã trả phòng',
  Cancelled: 'Đã hủy',
  'No-show': 'Không đến',
  Expired: 'Hết hạn',
  Unpaid: 'Chưa thanh toán',
  'Partially Paid': 'Thanh toán một phần',
  Paid: 'Đã thanh toán',
  Failed: 'Thất bại',
  'Pending payment': 'Đang thanh toán',
  Refunded: 'Đã hoàn tiền',
  'Partially Refunded': 'Hoàn tiền một phần',
  Vacant: 'Phòng trống',
  Occupied: 'Có khách',
  Reserved: 'Đã đặt',
  Maintenance: 'Bảo trì',
  Dirty: 'Cần dọn',
  Clean: 'Đã dọn',
  Inspected: 'Đã kiểm tra',
  Published: 'Đang hiển thị',
  Hidden: 'Đang ẩn',
  Draft: 'Bản nháp',
  Active: 'Hoạt động',
  Inactive: 'Ngừng hoạt động',
  Returning: 'Khách quay lại',
  New: 'Khách mới',
  Manager: 'Quản lý',
  Receptionist: 'Lễ tân',
  Housekeeping: 'Buồng phòng',
  Admin: 'Quản trị viên',
  Available: 'Còn trống',
  'Needs cleaning': 'Cần dọn',
};
export function statusTone(s: string): 'success' | 'warning' | 'danger' | 'info' | 'gold' | 'neutral' {
  const value = s.toLowerCase();
  if (/cancel|failed|maintenance|inactive|expired|blocked|unpaid|no-show/.test(value))
    return 'danger';
  if (/pending|reserved|dirty|partial|awaiting|in progress|needs cleaning/.test(value))
    return 'warning';
  if (/refunded|occupied|returning|manager/.test(value))
    return 'info';
  if (/paid|confirmed|active|clean|inspected|published|available|completed|checked-in|vacant/.test(value))
    return 'success';
  return 'neutral';
}
export function Status({ value }: {
  value: string;
}) {
  const { language } = useLocale();
  return <Badge tone={statusTone(value)}>
    {language === 'vi' ? (statusTranslations[value] ?? value) : value}
  </Badge>;
}
function useDismissLayer(open: boolean, refs: React.RefObject<HTMLElement | null>[], onDismiss: () => void) {
  useEffect(() => {
    if (!open)
      return;
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInside = refs.some((ref) => ref.current?.contains(target));
      if (!isInside)
        onDismiss();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape')
        onDismiss();
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, refs, onDismiss]);
}
function emitInputValue(name: string | undefined, value: string, onChange?: (event: ChangeEvent<HTMLInputElement>) => void) {
  onChange?.({ target: { name, value } } as ChangeEvent<HTMLInputElement>);
}
function emitSelectValue(name: string | undefined, value: string, onChange?: (event: ChangeEvent<HTMLSelectElement>) => void) {
  onChange?.({ target: { name, value } } as ChangeEvent<HTMLSelectElement>);
}
export function Card({ children, className = '', title, subtitle, action }: {
  children: ReactNode;
  className?: string;
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return <section className={`panel ${className}`}>
    {(title || subtitle || action) && <div className="panel-heading">
      <div>
        {title && <h2>
          {title}
        </h2>}
        {subtitle && <p>
          {subtitle}
        </p>}
      </div>
      {action}
    </div>}
    {children}
  </section>;
}
export function PageHeader({ title, description, action }: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return <div className="page-heading">
    <div>
      <h1>
        {title}
      </h1>
      {description && <p>
        {description}
      </p>}
    </div>
    {action && <div className="page-actions">
      {action}
    </div>}
  </div>;
}
export function Metric({ label, value, delta, icon }: {
  label: ReactNode;
  value: ReactNode;
  delta?: string;
  icon?: string;
}) {
  return <div className="metric">
    <div className="metric-top">
      <span>
        {label}
      </span>
      {icon && <Icon name={icon} size={18} />}
    </div>
    <div className="metric-value">
      {value}
    </div>
    {delta && <div className="metric-detail">
      {delta}
    </div>}
  </div>;
}
export function DateField({ label, placeholder, className = '', value, onChange, name, type, min, max, disabled, required, id, 'aria-label': ariaLabel, }: InputHTMLAttributes<HTMLInputElement> & {
  label?: ReactNode;
}) {
  const { language, t } = useLocale();
  const withTime = type === 'datetime-local';
  const locale = language === 'vi' ? 'vi-VN' : 'en-GB';
  const uid = useId();
  const controlId = id ?? `${uid}-date`;
  const panelId = `${uid}-calendar`;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const current = typeof value === 'string' ? value : '';
  const [draftDate, setDraftDate] = useState('');
  const [time, setTime] = useState('14:00');
  const [month, setMonth] = useState(() => parseCalendarDate(current.slice(0, 10)) ?? parseCalendarDate(hotelNow().slice(0, 10))!);
  const hotelDate = hotelNow().slice(0, 10);
  const minimum = typeof min === 'string' ? min : undefined;
  const maximum = typeof max === 'string' ? max : undefined;
  const selected = withTime ? draftDate : current;
  const dayAllowed = (day: string) => pickerValueInRange(day, minimum?.slice(0, 10), maximum?.slice(0, 10));
  const candidate = `${draftDate}T${time}`;
  const canApply = validPickerValue(candidate, true) && pickerValueInRange(candidate, minimum, maximum);
  const title = t(withTime ? L('Select date and time', 'Chọn ngày và giờ') : L('Select date', 'Chọn ngày'));
  const close = () => { setOpen(false); buttonRef.current?.focus({ preventScroll: true }); };
  const commit = (next: string) => { emitInputValue(name, next, onChange); close(); };
  const toggle = () => {
    if (open) {
      close();
      return;
    }
    const anchor = buttonRef.current;
    if (!anchor)
      return;
    const now = hotelNow();
    let initial = validPickerValue(current, withTime) ? current : (withTime ? now : now.slice(0, 10));
    if (minimum && initial < minimum && validPickerValue(minimum, withTime)) {
      initial = minimum;
    }
    if (maximum && initial > maximum && validPickerValue(maximum, withTime)) {
      initial = maximum;
    }
    setDraftDate(initial.slice(0, 10));
    setTime(withTime && initial.includes('T') ? initial.slice(11, 16) : '14:00');
    setMonth(parseCalendarDate(initial.slice(0, 10))!);
    // Portal into the dialog, outside its scrolling body, so its focus trap remains valid.
    setHost(anchor.closest<HTMLElement>('.modal') ?? document.body);
    setOpen(true);
  };
  useLayoutEffect(() => {
    if (!open || !host)
      return;
    const anchor = buttonRef.current;
    const panel = panelRef.current;
    if (!anchor || !panel)
      return;
    const position = () => {
      const rect = anchor.getBoundingClientRect();
      const scroller = anchor.closest('.modal-body');
      const bounds = scroller?.getBoundingClientRect();
      if ((bounds && (rect.bottom <= bounds.top || rect.top >= bounds.bottom)) || rect.bottom <= 0 || rect.top >= window.innerHeight) {
        setOpen(false);
        return;
      }
      const next = popupPosition(rect, panel.offsetWidth, panel.offsetHeight, window.innerWidth, window.innerHeight);
      panel.style.left = `${next.left}px`;
      panel.style.top = `${next.top}px`;
    };
    position();
    (panel.querySelector<HTMLElement>('.date-day.selected:not(:disabled)') ?? panel.querySelector<HTMLElement>('.date-day.today:not(:disabled)') ?? panel.querySelector<HTMLElement>('.mini-icon-btn'))?.focus({ preventScroll: true });
    const outside = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || panel.contains(event.target) || anchor.contains(event.target))
        return;
      setOpen(false);
    };
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        anchor.focus({ preventScroll: true });
      }
      if (event.key === 'Tab') {
        const items = Array.from(panel.querySelectorAll<HTMLElement>('button:not(:disabled), select:not(:disabled)'));
        const first = items[0];
        const last = items[items.length - 1];
        if (first && last && ((event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last))) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus({ preventScroll: true });
        }
      }
    };
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    document.addEventListener('pointerdown', outside, true);
    document.addEventListener('keydown', keydown, true);
    const observer = new ResizeObserver(position);
    observer.observe(anchor);
    observer.observe(panel);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
      document.removeEventListener('pointerdown', outside, true);
      document.removeEventListener('keydown', keydown, true);
    };
  }, [open, host]);
  useEffect(() => {
    if (disabled)
      setOpen(false);
  }, [disabled]);
  const weekNames = Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(new Date(2026, 10, 1 + index)));
  const shiftMonth = (amount: number) => setMonth(old => new Date(old.getFullYear(), old.getMonth() + amount, 1, 12));
  const selectDay = (day: string) => {
    if (withTime)
      setDraftDate(day);
    else
      commit(day);
  };
  const selectToday = () => {
    const day = hotelNow().slice(0, 10);
    if (!dayAllowed(day))
      return;
    setMonth(parseCalendarDate(day)!);
    selectDay(day);
  };
  const timeOptions = (count: number) => Array.from({ length: count }, (_, i) => String(i).padStart(2, '0'));
  return <div className="form-field picker-field">
    {label && <label className="form-label" htmlFor={controlId}>{label}</label>}
    <div className="popover-control">
      <input type="hidden" name={name} value={current} disabled={disabled} />
      <button ref={buttonRef} id={controlId} type="button" disabled={disabled} aria-label={ariaLabel ?? (label ? undefined : title)} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? panelId : undefined} aria-required={required} className={`field-control control-button ${className} ${open ? 'is-open' : ''}`.trim()} onClick={toggle}>
        <span className={`control-text ${current ? '' : 'placeholder'}`}>{displayPickerValue(current, withTime) || fieldPlaceholder(language, withTime ? 'datetime-local' : 'date', label, placeholder)}</span>
        <Icon name="calendar" size={16} className="control-icon" />
      </button>
    </div>
    {open && host && createPortal(<div ref={panelRef} id={panelId} className={`popover-panel date-panel picker-overlay ${withTime ? 'picker-with-time' : ''}`} role="dialog" aria-label={title}>
      <div className="popover-header">
        <strong>{new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(month)}</strong>
        <div className="popover-actions">
          <button type="button" className="mini-icon-btn" aria-label={t(L('Previous month', 'Tháng trước'))} onClick={() => shiftMonth(-1)}><Icon name="left" size={14} /></button>
          <button type="button" className="mini-icon-btn" aria-label={t(L('Next month', 'Tháng sau'))} onClick={() => shiftMonth(1)}><Icon name="right" size={14} /></button>
        </div>
      </div>
      <div className="date-grid-head">{weekNames.map((item, index) => <span key={index}>{item}</span>)}</div>
      <div className="date-grid-body">
        {calendarCells(month).map(day => {
          const iso = calendarIso(day);
          const chosen = iso === selected;
          return <button key={iso} type="button" disabled={!dayAllowed(iso)} aria-label={displayPickerValue(iso, false)} aria-pressed={chosen} className={`date-day ${day.getMonth() !== month.getMonth() ? 'outside' : ''} ${chosen ? 'selected' : ''} ${iso === hotelDate ? 'today' : ''}`.trim()} onClick={() => selectDay(iso)}>{day.getDate()}</button>;
        })}
      </div>
      {withTime && <div className="picker-time">
        <div className="picker-time-heading"><strong>{t(L('Select time', 'Chọn giờ'))}</strong><span>UTC+7 · 24h</span></div>
        <div className="picker-time-grid">
          <NativeSelect label={t(L('Hour', 'Giờ'))} value={time.slice(0, 2)} choices={timeOptions(24).map(value => ({ value, label: value }))} onChange={event => setTime(`${event.target.value}:${time.slice(3)}`)} />
          <NativeSelect label={t(L('Minute', 'Phút'))} value={time.slice(3)} choices={timeOptions(60).map(value => ({ value, label: value }))} onChange={event => setTime(`${time.slice(0, 2)}:${event.target.value}`)} />
        </div>
        <div className="picker-presets">{['08:00', '12:00', '14:00', '18:00'].map(preset => <Button key={preset} type="button" variant="secondary" aria-pressed={time === preset} onClick={() => setTime(preset)}>{preset}</Button>)}</div>
        <div className="picker-summary">{displayPickerValue(candidate, true)}</div>
      </div>}
      <PickerFooter shortcuts={<>
        <button type="button" className="popover-link" onClick={() => commit('')}>{t(L('Clear', 'Xóa'))}</button>
        <button type="button" className="popover-link strong" disabled={!dayAllowed(hotelDate)} onClick={selectToday}>{t(L('Today', 'Hôm nay'))}</button>
      </>} actions={withTime ? <>
        <Button type="button" variant="secondary" onClick={close}>{t(L('Cancel', 'Hủy'))}</Button>
        <Button type="button" disabled={!canApply} onClick={() => commit(candidate)}>{t(L('Apply', 'Áp dụng'))}</Button>
      </> : undefined} />
    </div>, host)}
  </div>;
}
export function TextInput({ label, type, ...props }: InputHTMLAttributes<HTMLInputElement> & {
  label?: ReactNode;
}) {
  const { language } = useLocale();
  if (type === 'date' || type === 'datetime-local') {
    return <DateField label={label} type={type} {...props} />;
  }
  return <label className="form-field">
    {label && <span className="form-label">
      {label}
    </span>}
    <input {...props} type={type} placeholder={props.readOnly || type === 'hidden' || type === 'checkbox' || type === 'radio' || type === 'file' || type === 'range' ? props.placeholder : fieldPlaceholder(language, type ?? 'text', label ?? props['aria-label'], props.placeholder)} className={`field-control ${props.className ?? ''}`.trim()} />
  </label>;
}
export function TextArea({ label, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: ReactNode;
}) {
  const { language } = useLocale();
  return <label className="form-field">
    {label && <span className="form-label">
      {label}
    </span>}
    <textarea {...props} placeholder={props.readOnly ? props.placeholder : fieldPlaceholder(language, 'textarea', label ?? props['aria-label'], props.placeholder)} className={`field-control field-textarea ${props.className ?? ''}`.trim()} />
  </label>;
}
export function NativeSelect({ label, choices, placeholder, value, onChange, name, className = '', }: SelectHTMLAttributes<HTMLSelectElement> & {
  label?: ReactNode;
  choices: {
    value: string;
    label: string;
  }[];
  placeholder?: string;
}) {
  const { language } = useLocale();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  useDismissLayer(open, [wrapperRef], () => setOpen(false));
  const currentValue = typeof value === 'string' ? value : '';
  const active = choices.find((choice) => choice.value === currentValue);
  const display = active?.label ?? fieldPlaceholder(language, 'select', label, placeholder);
  return <label className="form-field">
    {label && <span className="form-label">
      {label}
    </span>}
    <div className="popover-control" ref={wrapperRef}>
      <input type="hidden" name={name} value={currentValue} />
      <button type="button" className={`field-control control-button ${className} ${open ? 'is-open' : ''}`.trim()} onClick={() => setOpen((current) => !current)}>
        <span className={`control-text ${active ? '' : 'placeholder'}`}>
          {display}
        </span>
        <Icon name="down" size={15} className={`control-icon ${open ? 'rotate' : ''}`} />
      </button>
      {open && <div className="popover-panel select-panel" role="listbox">
        {choices.map((choice) => <button type="button" key={choice.value} className={`select-option ${choice.value === currentValue ? 'selected' : ''}`} onClick={() => {
          emitSelectValue(name, choice.value, onChange);
          setOpen(false);
        }}>
          <span>
            {choice.label}
          </span>
          {choice.value === currentValue && <Icon name="check" size={14} />}
        </button>)}
      </div>}
    </div>
  </label>;
}
export function FileUploadField({ label, value, onChange, help, accept = IMAGE_ACCEPT, }: {
  label?: ReactNode;
  value?: string;
  onChange: (next: string) => void;
  help?: ReactNode;
  accept?: string;
}) {
  return (<ImageUpload label={label} images={value ? [value] : []} multiple={false} accept={accept} help={help} onFiles={async (files) => {
    const file = files[0];
    if (file)
      onChange(await readImageFile(file));
  }} onImagesChange={images => onChange(images[0] ?? '')} />);
}
export function Modal({ title, onClose, children, footer, width = 'md' }: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: 'md' | 'lg';
}) {
  const { t } = useLocale();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog)
      return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])')).filter(element => element.tabIndex >= 0 && element.getClientRects().length > 0);
    const firstField = focusable().find(element => element.matches('.modal-body input:not([readonly]), .modal-body textarea:not([readonly]), .modal-body select'));
    (firstField ?? focusable()[0] ?? dialog).focus({ preventScroll: true });
    const key = (event: KeyboardEvent) => {
      if (event.defaultPrevented)
        return;
      if (event.key === 'Escape') {
        if (dialog.querySelector('.popover-control .is-open'))
          return;
        event.preventDefault();
        onCloseRef.current();
      }
      else if (event.key === 'Tab') {
        const items = focusable();
        const first = items[0];
        const last = items[items.length - 1];
        if (!first || !last) {
          event.preventDefault();
          dialog.focus();
        }
        else if (event.shiftKey && (document.activeElement === first || !items.includes(document.activeElement as HTMLElement))) {
          event.preventDefault();
          last.focus();
        }
        else if (!event.shiftKey && (document.activeElement === last || !items.includes(document.activeElement as HTMLElement))) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('keydown', key);
      document.body.style.overflow = previousOverflow;
      if (previous?.isConnected)
        previous.focus({ preventScroll: true });
    };
  }, []);
  return createPortal(<div className="modal-overlay" role="presentation" onMouseDown={event => {
    if (event.target === event.currentTarget)
      onClose();
  }}>
    <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} className={`modal modal-${width}`}>
      <header className="modal-header">
        <h2 id={titleId}>
          {title}
        </h2>
        <button type="button" className="icon-btn" aria-label={t(L('Close', 'Đóng'))} onClick={onClose}>
          <Icon name="close" />
        </button>
      </header>
      <div className="modal-body">
        {children}
      </div>
      {footer && <footer className="modal-footer">
        {footer}
      </footer>}
    </div>
  </div>, document.body);
}
export function Empty({ message }: {
  message: ReactNode;
}) {
  return <div className="empty">
    <Icon name="search" size={24} />
    <p>
      {message}
    </p>
  </div>;
}
export function SimpleTable({ columns, rows, empty }: {
  columns: {
    title: ReactNode;
    key: string;
    className?: string;
    render?: (row: Record<string, unknown>) => ReactNode;
  }[];
  rows: Record<string, unknown>[];
  empty?: ReactNode;
}) {
  return <div className="table-wrap">
    <table className="data-table">
      <thead>
        <tr>
          {columns.map((column) => <th key={column.key} className={column.className}>
            {column.title}
          </th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => <tr key={String(row.id ?? row.number ?? row.code ?? row.email ?? index)}>
          {columns.map((column) => <td key={column.key} className={column.className}>
            {column.render?.(row) ?? String(row[column.key] ?? '—')}
          </td>)}
        </tr>)}
      </tbody>
    </table>
    {!rows.length && <Empty message={empty ?? 'No records match your filters.'} />}
  </div>;
}
export function Tabs({ items, value, onChange }: {
  items: {
    id: string;
    label: ReactNode;
  }[];
  value: string;
  onChange: (s: string) => void;
}) {
  return <div className="tabs" role="tablist">
    {items.map((item) => <button key={item.id} type="button" role="tab" aria-selected={value === item.id} className={value === item.id ? 'tab active' : 'tab'} onClick={() => onChange(item.id)}>
      {item.label}
    </button>)}
  </div>;
}
export function SearchBox({ value, onChange, placeholder }: {
  value: string;
  onChange: (s: string) => void;
  placeholder?: string;
}) {
  const { t } = useLocale();
  return <label className="search-box">
    <Icon name="search" size={17} />
    <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder ?? t(L('Search records…', 'Tìm kiếm dữ liệu…'))} />
  </label>;
}
export function useToast() {
  const [toast, setToast] = useState('');
  useEffect(() => {
    if (!toast)
      return;
    const timeout = setTimeout(() => setToast(''), 3600);
    return () => clearTimeout(timeout);
  }, [toast]);
  return {
    toast,
    notify: setToast,
    Toast: () => toast ? <div className="toast" role="status">
      <Icon name="check" />
      {toast}
    </div> : null,
  };
}
export function Money({ value }: {
  value: number;
}) {
  const { language } = useLocale();
  return <>
    {formatMoney(value, language)}
  </>;
}
export function FieldHelp({ children }: {
  children: ReactNode;
}) {
  return <span className="field-help">
    {children}
  </span>;
}
export function ProgressBar({ value, max = 100 }: {
  value: number;
  max?: number;
}) {
  return <div className="progress-track">
    <span style={{ width: `${Math.min(100, Math.max(0, value / max * 100))}%` }} />
  </div>;
}
export function Switch({ checked, onChange, label }: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  const id = useId();
  return <label className="switch-row" htmlFor={id}>
    <span>
      {label}
    </span>
    <input id={id} type="checkbox" role="switch" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    <span className="switch-track" />
  </label>;
}
export function InfoBanner({ children }: {
  children: ReactNode;
}) {
  return <div className="info-banner">
    <Icon name="info" size={17} />
    <div>
      {children}
    </div>
  </div>;
}
export function MiniBarChart({ values, labels }: {
  values: number[];
  labels?: string[];
}) {
  const max = Math.max(...values, 1);
  return <div className="mini-chart">
    {values.map((value, index) => <div className="mini-col" key={index}>
      <span className="mini-column" style={{ height: `${Math.max(5, value / max * 100)}%` }} title={`${labels?.[index] ?? index + 1}: ${value}`} />
      {labels && <small>
        {labels[index]}
      </small>}
    </div>)}
  </div>;
}
export function StatList({ items }: {
  items: {
    label: ReactNode;
    value: ReactNode;
  }[];
}) {
  return <div className="stat-list">
    {items.map((item, index) => <div key={index}>
      <span>
        {item.label}
      </span>
      <strong>
        {item.value}
      </strong>
    </div>)}
  </div>;
}
export function IconAction({ label, name, onClick, danger = false }: {
  label: string;
  name: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return <button type="button" className={`icon-btn${name === 'edit' || name === 'trash' ? ' icon-row-action' : ''}${danger || name === 'trash' ? ' icon-row-danger' : ''}`} title={label} aria-label={label} onClick={onClick}>
    <Icon name={name} />
  </button>;
}
export const paidMessage = (language: Language) => language === 'en'
  ? 'Demo data only — no transactions are processed.'
  : 'Chỉ là dữ liệu mẫu — không có giao dịch thực tế.';
