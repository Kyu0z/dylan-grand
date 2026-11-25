import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Button, Card, Empty, Modal, NativeSelect, SimpleTable, TextArea, TextInput } from '../components/ui';
import { ImageUpload } from '../components/image-upload';
import { useAdminAuth } from '../lib/admin-auth';
import { L, formatMoney, type Localized } from '../lib/domain';
import { useLocale } from '../lib/locale';
export type Row = Record<string, unknown>;
export const obj = (v: unknown): Row => v && typeof v === 'object' && !Array.isArray(v) ? v as Row : {};
export const rows = (v: unknown): Row[] => Array.isArray(v) ? v.map(obj) : [];
export const str = (v: unknown): string => typeof v === 'string' || typeof v === 'number' ? String(v) : '';
export const num = (v: unknown): number => typeof v === 'number' ? v : Number(v || 0);
export const date = (v: unknown) => str(v).slice(0, 10);
export const pathId = (v: unknown) => encodeURIComponent(str(v));
export const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export function plusDays(d: string, n: number) {
  const x = new Date(`${d}T00:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
}
export const statusText: Record<string, Localized> = {
  PENDING: L('Pending hold', 'Đang giữ chỗ'),
  CONFIRMED: L('Confirmed', 'Đã xác nhận'),
  CHECKED_IN: L('Checked in', 'Đã nhận phòng'),
  CHECKED_OUT: L('Checked out', 'Đã trả phòng'),
  CANCELLED: L('Cancelled', 'Đã hủy'),
  NO_SHOW: L('No-show', 'Không đến'),
  EXPIRED: L('Expired', 'Hết hạn'),
  DIRTY: L('Dirty', 'Cần dọn'),
  CLEAN: L('Clean', 'Đã dọn'),
  INSPECTED: L('Inspected', 'Đã kiểm tra'),
  REQUESTED: L('Requested', 'Đã yêu cầu'),
  FULFILLED: L('Fulfilled', 'Đã cung cấp'),
  PAYMENT: L('Payment', 'Thu tiền'),
  REFUND: L('Refund', 'Hoàn tiền'),
  CASH: L('Cash', 'Tiền mặt'),
  BANK_TRANSFER: L('Bank transfer', 'Chuyển khoản'),
  FLEXIBLE: L('Flexible', 'Linh hoạt'),
  NON_REFUNDABLE: L('Non-refundable', 'Không hoàn tiền'),
  AVAILABLE: L('Available', 'Còn trống'),
  MAINTENANCE: L('Maintenance', 'Bảo trì'),
  BLOCKED: L('Not sellable', 'Ngừng bán'),
  PAID: L('Paid', 'Đã thanh toán'),
  UNPAID: L('Unpaid', 'Chưa thanh toán'),
  PARTIALLY_PAID: L('Partially paid', 'Thanh toán một phần'),
  REFUNDED: L('Refunded', 'Đã hoàn tiền'),
  PARTIALLY_REFUNDED: L('Partially refunded', 'Hoàn tiền một phần'),
};
export function StatusValue({ value }: {
  value: unknown;
}) {
  const { t } = useLocale();
  return <span>
    {t(statusText[str(value)] ?? str(value)) || '—'}
  </span>;
}
export function Cash({ value }: {
  value: unknown;
}) {
  const { language } = useLocale();
  return <>
    {formatMoney(num(value), language)}
  </>;
}
export function useData<T>(path: string | null) {
  const { api } = useAdminAuth();
  const [state, setState] = useState<{
    path: string | null;
    data: T | null;
    loading: boolean;
    failed: boolean;
  }>({ path: null, data: null, loading: true, failed: false });
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion(n => n + 1), []);
  useEffect(() => {
    let active = true;
    if (!path) {
      setState({ path, data: null, loading: false, failed: false });
      return;
    }
    setState({ path, data: null, loading: true, failed: false });
    api<T>(path).then(data => {
      if (active)
        setState({ path, data, loading: false, failed: false });
    }).catch(() => {
      if (active)
        setState({ path, data: null, loading: false, failed: true });
    });
    return () => {
      active = false;
    };
  }, [api, path, version]);
  return { ...(state.path === path ? state : { path, data: null, loading: Boolean(path), failed: false }), reload };
}
export function DataState({ loading, failed, reload, children }: {
  loading: boolean;
  failed: boolean;
  reload: () => void;
  children: ReactNode;
}) {
  const { t } = useLocale();
  return loading ? <Card>
    <p role="status">
      {t(L('Loading…', 'Đang tải…'))}
    </p>
  </Card> : failed ? <Card>
    <p role="alert">
      {t(L('Unable to load data.', 'Không thể tải dữ liệu.'))}
    </p>
    <Button variant="secondary" onClick={reload}>
      {t(L('Retry', 'Thử lại'))}
    </Button>
  </Card> : <>
    {children}
  </>;
}
type Col = {
  key: string;
  label: Localized;
  render?: (r: Row) => ReactNode;
};
export const col = (key: string, en: string, vi: string, render?: Col['render']): Col => ({ key, label: L(en, vi), render });
export function Table({ data, columns }: {
  data: Row[];
  columns: Col[];
}) {
  const { t } = useLocale();
  return <SimpleTable rows={data} columns={columns.map(c => ({ key: c.key, title: t(c.label), render: c.render }))} empty={t(L('No records.', 'Chưa có dữ liệu.'))} />;
}
export type Field = {
  key: string;
  label: Localized;
  kind?: 'text' | 'number' | 'date' | 'datetime-local' | 'email' | 'textarea' | 'select' | 'check' | 'images';
  initial?: string | number | boolean;
  required?: boolean;
  min?: number;
  max?: number;
  maxLength?: number;
  choices?: {
    value: string;
    label: Localized | string;
  }[];
};
export const field = (key: string, en: string, vi: string, props: Omit<Field, 'key' | 'label'> = {}): Field => ({ key, label: L(en, vi), ...props });
export const options = (values: string[]) => values.map(value => ({ value, label: statusText[value] ?? value }));
export type Values = Record<string, string | number | boolean>;
export type Action = {
  title: Localized;
  fields: Field[];
  run: (v: Values, requestId: string) => Promise<unknown>;
  detail?: Localized;
  danger?: boolean;
};
export function useAction(reload: () => void) {
  const [action, setAction] = useState<Action | null>(null);
  return {
    open: setAction, dialog: action ? <ActionDialog key={action.title.en} action={action} onClose={() => setAction(null)} onDone={() => {
      setAction(null);
      reload();
    }} /> : null
  };
}
function ActionDialog({ action, onClose, onDone }: {
  action: Action;
  onClose: () => void;
  onDone: () => void;
}) {
  const { t } = useLocale();
  const { notify, api } = useAdminAuth();
  const [values, setValues] = useState<Values>(() => Object.fromEntries(action.fields.map(f => [f.key, f.initial ?? (f.kind === 'check' ? false : '')])));
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const requestId = useRef('');
  const lastPayload = useRef('');
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (lock.current)
      return;
    for (const f of action.fields) {
      const v = values[f.key];
      if (f.required !== false && (f.kind === 'check' ? v !== true : !String(v).trim())) {
        notify(t(L('Please complete all required fields.', 'Vui lòng điền đầy đủ trường bắt buộc.')), true);
        return;
      }
      if (f.kind === 'number' && v !== '' && (!Number.isSafeInteger(Number(v)) || Number(v) < (f.min ?? 0) || Number(v) > (f.max ?? 2000000000))) {
        notify(t(L('Invalid numeric value.', 'Giá trị số không hợp lệ.')), true);
        return;
      }
    }
    const payload = JSON.stringify(values);
    if (lastPayload.current !== payload) {
      requestId.current = crypto.randomUUID();
      lastPayload.current = payload;
    }
    lock.current = true;
    setBusy(true);
    try {
      await action.run(values, requestId.current);
      onDone();
    }
    catch { /* API toast already emitted. */ }
    finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const upload = async (key: string, files: File[]) => {
    if (lock.current || !files.length)
      return;
    const urls = str(values[key]).split('\n').filter(Boolean);
    if (urls.length + files.length > 10) {
      notify(t(L('Maximum 10 room photos.', 'Tối đa 10 ảnh phòng.')), true);
      return;
    }
    if (files.some(file => file.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))) {
      notify(t(L('Choose JPEG, PNG or WebP images up to 5 MB.', 'Chọn ảnh JPEG, PNG hoặc WebP tối đa 5 MB.')), true);
      return;
    }
    lock.current = true;
    setBusy(true);
    try {
      for (const file of files) {
        const body = new FormData();
        body.append('file', file);
        const result = await api<{
          url: string;
        }>('/admin/room-types/images', { method: 'POST', body });
        setValues(previous => ({ ...previous, [key]: [...str(previous[key]).split('\n').filter(Boolean), result.url].join('\n') }));
      }
    }
    finally {
      // Successful uploads remain in the draft even if a later file fails.
      lock.current = false;
      setBusy(false);
    }
  };
  const change = (k: string, v: string | number | boolean) => setValues(old => ({ ...old, [k]: v }));
  return <Modal title={t(action.title)} width="lg" onClose={() => {
    if (!lock.current)
      onClose();
  }}>
    <form className="live-form" onSubmit={submit}>
      {action.detail && <p>
        {t(action.detail)}
      </p>}
      {action.fields.map(f => {
        const label = t(f.label);
        const value = values[f.key];
        return f.kind === 'images' ? (
          <ImageUpload
            key={f.key}
            label={label}
            images={str(value).split('\n').filter(Boolean)}
            busy={busy}
            onFiles={files => upload(f.key, files)}
            onImagesChange={images => change(f.key, images.join('\n'))}
            onInvalid={message => notify(message, true)}
          />
        ) : f.kind === 'check' ? <label className="live-check" key={f.key}>
          <input type="checkbox" checked={Boolean(value)} onChange={e => change(f.key, e.target.checked)} />
          {label}
        </label> : f.kind === 'select' ? <NativeSelect key={f.key} label={label} value={str(value)} choices={(f.choices ?? []).map(c => ({ value: c.value, label: t(c.label) }))} onChange={e => change(f.key, e.target.value)} /> : f.kind === 'textarea' ? <TextArea key={f.key} label={label} value={str(value)} maxLength={f.maxLength} required={f.required !== false} onChange={e => change(f.key, e.target.value)} /> : <TextInput key={f.key} label={label} type={f.kind ?? 'text'} value={str(value)} required={f.required !== false} min={f.min} max={f.max} maxLength={f.maxLength} step={f.kind === 'number' ? 1 : undefined} onChange={e => change(f.key, e.target.value)} />;
      })}
      <div className="live-actions">
        <Button type="button" variant="secondary" disabled={busy} onClick={onClose}>
          {t(L('Cancel', 'Hủy'))}
        </Button>
        <Button type="submit" variant={action.danger ? 'danger' : 'primary'} disabled={busy}>
          {t(busy ? L('Processing…', 'Đang xử lý…') : L('Confirm', 'Xác nhận'))}
        </Button>
      </div>
    </form>
  </Modal>;
}
export function RowActions({ children }: {
  children: ReactNode;
}) {
  return <div className="live-actions">
    {children}
  </div>;
}
