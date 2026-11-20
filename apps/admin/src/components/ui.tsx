import {
  useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes,
  type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes,
} from 'react';
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
};
export function Icon({ name, size = 18, className = '' }: { name: string; size?: number; className?: string; }) {
  return <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.65"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true">
    {paths[name] ?? paths.grid}
  </svg>;
}
export function Button({ children, variant = 'primary', icon, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; icon?: string; }) {
  return <button {...props} className={`btn btn-${variant} ${props.className ?? ''}`}>
    {icon && <Icon name={icon} size={15} />}
    <span>
      {children}
    </span>
  </button>;
}
export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'gold'; }) {
  return <span className={`status-badge badge-${tone}`}>
    <span className="status-dot" />
    {children}
  </span>;
}
const statusTranslations: Record<string, string> = {
  'Pending': 'Đang chờ',
  'Confirmed': 'Đã xác nhận',
  'Checked-in': 'Đã nhận phòng',
  'Checked-out': 'Đã trả phòng',
  'Cancelled': 'Đã hủy',
  'No-show': 'Không đến',
  'Expired': 'Hết hạn',
  'Unpaid': 'Chưa thanh toán',
  'Partially Paid': 'Thanh toán một phần',
  'Paid': 'Đã thanh toán',
  'Failed': 'Thất bại',
  'Pending payment': 'Đang thanh toán',
  'Refunded': 'Đã hoàn tiền',
  'Partially Refunded': 'Hoàn tiền một phần',
  'Vacant': 'Phòng trống',
  'Occupied': 'Có khách',
  'Reserved': 'Đã đặt',
  'Maintenance': 'Bảo trì',
  'Dirty': 'Cần dọn',
  'Clean': 'Đã dọn',
  'Inspected': 'Đã kiểm tra',
  'Published': 'Đang hiển thị',
  'Hidden': 'Đang ẩn',
  'Draft': 'Bản nháp',
  'Active': 'Hoạt động',
  'Inactive': 'Ngừng hoạt động',
  'Returning': 'Khách quay lại',
  'New': 'Khách mới',
  'Manager': 'Quản lý',
  'Receptionist': 'Lễ tân',
  'Housekeeping': 'Buồng phòng',
  'Admin': 'Quản trị viên',
};

export function statusTone(s: string): 'success' | 'warning' | 'danger' | 'info' | 'gold' | 'neutral' {
  const value = s.toLowerCase();
  if (/cancel|failed|maintenance|inactive|expired|blocked|unpaid|no-show/.test(value)) return 'danger';
  if (/pending|reserved|dirty|partial|awaiting|in progress/.test(value)) return 'warning';
  if (/refunded|occupied|returning|manager/.test(value)) return 'info';
  if (/paid|confirmed|active|clean|inspected|published|available|completed|checked-in/.test(value)) return 'success';
  return 'neutral';
}

export function Status({ value }: { value: string; }) {
  const { language } = useLocale();
  return (
    <Badge tone={statusTone(value)}>
      {language === 'vi' ? (statusTranslations[value] ?? value) : value}
    </Badge>
  );
}

export function Card({ children, className = '', title, subtitle, action }: { children: ReactNode; className?: string; title?: ReactNode; subtitle?: ReactNode; action?: ReactNode; }) {
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
export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: ReactNode; title: ReactNode; description?: ReactNode; action?: ReactNode; }) {
  return <div className="page-heading">
    <div>
      {eyebrow && <div className="eyebrow">
        {eyebrow}
      </div>}
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
export function Metric({ label, value, delta, icon }: { label: ReactNode; value: ReactNode; delta?: string; icon?: string; }) {
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
export function TextInput({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label?: ReactNode; }) {
  return <label className="form-field">
    {label && <span className="form-label">
      {label}
    </span>}
    <input {...props} className={`field-control ${props.className ?? ''}`} />
  </label>;
}
export function TextArea({ label, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: ReactNode; }) {
  return <label className="form-field">
    {label && <span className="form-label">
      {label}
    </span>}
    <textarea {...props} className={`field-control field-textarea ${props.className ?? ''}`} />
  </label>;
}
export function NativeSelect({ label, choices, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label?: ReactNode; choices: { value: string; label: string; }[]; }) {
  return <label className="form-field">
    {label && <span className="form-label">
      {label}
    </span>}
    <span className="select-wrap">
      <select {...props} className={`field-control ${props.className ?? ''}`}>
        {choices.map(c => <option key={c.value} value={c.value}>
          {c.label}
        </option>)}
      </select>
      <Icon name="down" size={15} />
    </span>
  </label>;
}
export function Modal({ title, onClose, children, footer, width = 'md' }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; width?: 'md' | 'lg'; }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', key);
    closeRef.current?.focus();
    return () => document.removeEventListener('keydown', key);
  }, [onClose]);
  return <div className="modal-overlay" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div role="dialog" aria-modal="true" aria-label={title} className={`modal modal-${width}`}>
      <header className="modal-header">
        <h2>
          {title}
        </h2>
        <button ref={closeRef} className="icon-btn" aria-label="Close" onClick={onClose}>
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
  </div>;
}
export function Empty({ message }: { message: ReactNode; }) {
  return <div className="empty">
    <Icon name="search" size={24} />
    <p>
      {message}
    </p>
  </div>;
}
export function SimpleTable({ columns, rows, empty }: { columns: { title: ReactNode; key: string; className?: string; render?: (row: Record<string, unknown>) => ReactNode; }[]; rows: Record<string, unknown>[]; empty?: ReactNode; }) {
  return <div className="table-wrap">
    <table className="data-table">
      <thead>
        <tr>
          {columns.map(c => <th key={c.key} className={c.className}>
            {c.title}
          </th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, index) => <tr key={String(r.id ?? r.number ?? r.code ?? r.email ?? index)}>
          {columns.map(c => <td key={c.key} className={c.className}>
            {c.render?.(r) ?? String(r[c.key] ?? '—')}
          </td>)}
        </tr>)}
      </tbody>
    </table>
    {!rows.length && <Empty message={empty ?? 'No records match your filters.'} />}
  </div>;
}
export function Tabs({ items, value, onChange }: { items: { id: string; label: ReactNode; }[]; value: string; onChange: (s: string) => void; }) {
  return <div className="tabs" role="tablist">
    {items.map(item => <button
      key={item.id}
      type="button"
      role="tab"
      aria-selected={value === item.id}
      className={value === item.id ? 'tab active' : 'tab'}
      onClick={() => onChange(item.id)}>
      {item.label}
    </button>)}
  </div>;
}
export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (s: string) => void; placeholder?: string; }) {
  const { t } = useLocale();
  return <label className="search-box">
    <Icon name="search" size={17} />
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder ?? t(L('Search records…', 'Tìm kiếm dữ liệu…'))} />
  </label>;
}
export function useToast() {
  const [toast, setToast] = useState('');
  useEffect(() => { if (!toast) return; const timeout = setTimeout(() => setToast(''), 3600); return () => clearTimeout(timeout); }, [toast]);
  return {
    toast, notify: setToast, Toast: () => toast ? <div className="toast" role="status">
      <Icon name="check" />
      {toast}
    </div> : null
  };
}
export function Money({ value }: { value: number; }) {
  const { language } = useLocale(); return <>
    {formatMoney(value, language)}
  </>;
}
export function FieldHelp({ children }: { children: ReactNode; }) {
  return <span className="field-help">
    {children}
  </span>;
}
export function ProgressBar({ value, max = 100 }: { value: number; max?: number; }) {
  return <div className="progress-track">
    <span style={{ width: `${Math.min(100, Math.max(0, value / max * 100))}%` }} />
  </div>;
}
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (next: boolean) => void; label: string; }) {
  const id = useId(); return <label className="switch-row" htmlFor={id}>
    <span>
      {label}
    </span>
    <input id={id} type="checkbox" role="switch" checked={checked} onChange={e => onChange(e.target.checked)} />
    <span className="switch-track" />
  </label>;
}
export function InfoBanner({ children }: { children: ReactNode; }) {
  return <div className="info-banner">
    <Icon name="info" size={17} />
    <div>
      {children}
    </div>
  </div>;
}
export function MiniBarChart({ values, labels }: { values: number[]; labels?: string[]; }) {
  const max = Math.max(...values, 1); return <div className="mini-chart">
    {values.map((value, index) => <div className="mini-col" key={index}>
      <span className="mini-column" style={{ height: `${Math.max(5, value / max * 100)}%` }} title={`${labels?.[index] ?? index + 1}: ${value}`} />
      {labels && <small>
        {labels[index]}
      </small>}
    </div>)}
  </div>;
}
export function StatList({ items }: { items: { label: ReactNode; value: ReactNode; }[]; }) {
  return <div className="stat-list">
    {items.map((x, i) => <div key={i}>
      <span>
        {x.label}
      </span>
      <strong>
        {x.value}
      </strong>
    </div>)}
  </div>;
}
export function IconAction({ label, name, onClick }: { label: string; name: string; onClick: () => void; }) {
  return <button type="button" className="icon-btn" title={label} aria-label={label} onClick={onClick}>
    <Icon name={name} />
  </button>;
}
export const paidMessage = (language: Language) => language === 'en' ? 'Demo data only — no transactions are processed.' : 'Chỉ là dữ liệu mẫu — không có giao dịch thực tế.';
