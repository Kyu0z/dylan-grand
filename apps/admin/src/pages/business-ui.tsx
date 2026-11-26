import { MoneyInput } from '../components/money-input';
import { numericDraftValid } from '../lib/money-input';
import { hotelNow, nextPickerValue, validPickerValue } from '../lib/date-picker';
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Button, Card, Empty, Modal, NativeSelect, SimpleTable, TextArea, TextInput } from '../components/ui';
import { ImageUpload } from '../components/image-upload';
import { DeleteConfirmation } from '../components/delete-confirmation';
import { useAdminAuth } from '../lib/admin-auth';
import { L, formatMoney, type Localized } from '../lib/domain';
import { useLocale } from '../lib/locale';
export type Row = Record<string, unknown>;
export const obj = (v: unknown): Row => v && typeof v === 'object' && !Array.isArray(v) ? v as Row : {};
export const rows = (v: unknown): Row[] => Array.isArray(v) ? v.map(obj) : [];
export const str = (v: unknown): string => typeof v === 'string' || typeof v === 'number' ? String(v) : '';
export const num = (v: unknown): number => typeof v === 'number' ? v : Number(v || 0);
export const date = (v: unknown) => str(v).slice(0, 10);
export const displayDate = (v: unknown) => /^\d{4}-\d{2}-\d{2}$/.test(date(v)) ? date(v).split('-').reverse().join('/') : '—';
export const pathId = (v: unknown) => encodeURIComponent(str(v));
export const today = () => hotelNow().slice(0, 10);
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
  kind?: 'text' | 'promotion-code' | 'number' | 'money' | 'date' | 'datetime-local' | 'email' | 'textarea' | 'select' | 'check' | 'images' | 'service-image';
  initial?: string | number | boolean;
  required?: boolean;
  min?: number;
  minDate?: string;
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
  inclusiveEnd?: boolean;
  pricingPreview?: boolean;
  deleteTarget?: Localized | string;
  danger?: boolean;
  confirmLabel?: Localized;
};
export function createDeleteAction({ title, target, run }: {
  title: Localized;
  target: Localized | string;
  run: () => Promise<unknown>;
}): Action {
  return {
    title,
    deleteTarget: target,
    fields: [],
    danger: true,
    confirmLabel: L('Delete', 'Xóa'),
    run,
  };
}
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
  const [generating, setGenerating] = useState(false);
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
      if ((f.kind === 'date' || f.kind === 'datetime-local') && v !== '' && !validPickerValue(str(v), f.kind === 'datetime-local')) {
        notify(t(L('Invalid date or time.', 'Ngày hoặc giờ không hợp lệ.')), true);
        return;
      }
      if (f.kind === 'promotion-code' && str(v).trim() && !/^[A-Z0-9_-]{3,32}$/.test(str(v).trim().toUpperCase())) {
        notify(t(L('Use 3–32 letters, numbers, hyphens or underscores for the promotion code.', 'Mã ưu đãi gồm 3–32 chữ cái, chữ số, dấu gạch ngang hoặc gạch dưới.')), true);
        return;
      }
      if ((f.kind === 'money' && v !== '' && !numericDraftValid(String(v), f.min ?? 0, f.max ?? 2000000000)) || (f.kind === 'number' && v !== '' && (!Number.isSafeInteger(Number(v)) || Number(v) < (f.min ?? 0) || Number(v) > (f.max ?? 2000000000)))) {
        notify(t(L('Invalid numeric value.', 'Giá trị số không hợp lệ.')), true);
        return;
      }
    }
    for (const [start, end] of [['startDate', 'endDate'], ['checkIn', 'checkOut'], ['startsAt', 'endsAt']]) {
      if (values[start] && values[end] && (action.inclusiveEnd && start === 'startDate' ? str(values[end]) < str(values[start]) : str(values[end]) <= str(values[start]))) {
        notify(t(L('The end date and time must be after the start.', 'Ngày giờ kết thúc phải sau ngày giờ bắt đầu.')), true);
        return;
      }
    }
    if (action.pricingPreview && (str(values.startDate) < today() || (Date.parse(str(values.endDate)) - Date.parse(str(values.startDate))) / 86400000 >= 366)) {
      notify(t(L('Select 1–366 days from today onwards.', 'Chọn từ 1–366 ngày, bắt đầu từ hôm nay.')), true);
      return;
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
    const single = action.fields.find(f => f.key === key)?.kind === 'service-image';
    const urls = str(values[key]).split('\n').filter(Boolean);
    if (single ? files.length !== 1 : urls.length + files.length > 10) {
      notify(t(single ? L('Select one service image.', 'Chọn một ảnh dịch vụ.') : L('Maximum 10 room photos.', 'Tối đa 10 ảnh phòng.')), true);
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
        }>(single ? '/admin/promotions/services/images' : '/admin/room-types/images', { method: 'POST', body });
        setValues(previous => ({ ...previous, [key]: single ? result.url : [...str(previous[key]).split('\n').filter(Boolean), result.url].join('\n') }));
      }
    }
    finally {
      // Successful uploads remain in the draft even if a later file fails.
      lock.current = false;
      setBusy(false);
    }
  };
  const change = (k: string, v: string | number | boolean) => setValues(old => ({ ...old, [k]: v }));
  const renderField = (f: Field, dateMinimum?: string) => {
    const label = t(f.label);
    const value = values[f.key];
    if (f.kind === 'money') {
      return <MoneyInput key={f.key} label={label} value={str(value)} required={f.required !== false} signed={(f.min ?? 0) < 0} disabled={busy} onValueChange={raw => change(f.key, raw)} />;
    }
    if (f.kind === 'promotion-code')
      return <div key={f.key} className="promotion-code-field">
        <div className="promotion-code-row">
          <TextInput label={label} value={str(value)} maxLength={f.maxLength} disabled={busy || generating} onChange={event => change(f.key, event.target.value.toUpperCase())} />
          <Button type="button" variant="secondary" icon="refresh" disabled={busy || generating} onClick={async () => {
            if (lock.current)
              return;
            lock.current = true;
            setGenerating(true);
            try {
              const result = await api<{
                code: string;
              }>('/admin/promotions/generate-code', { method: 'POST', silentSuccess: true });
              change(f.key, result.code);
            }
            catch { /* API error toast already emitted. */ }
            finally {
              lock.current = false;
              setGenerating(false);
            }
          }}>{t(generating ? L('Generating…', 'Đang tạo…') : L('Generate', 'Tạo mã'))}</Button>
        </div>
        <p className="field-help">{t(L('Enter a code, generate one, or leave blank to generate on save.', 'Nhập mã, tạo mã hoặc để trống để hệ thống tự sinh khi lưu.'))}</p>
      </div>;
    return (f.kind === 'images' || f.kind === 'service-image') ? (<ImageUpload multiple={f.kind === 'images'} key={f.key} label={label} images={str(value).split('\n').filter(Boolean)} busy={busy} onFiles={files => upload(f.key, files)} onImagesChange={images => change(f.key, images.join('\n'))} onInvalid={message => notify(message, true)} />) : f.kind === 'check' ? <label className="live-check" key={f.key}>
      <input type="checkbox" checked={Boolean(value)} onChange={e => change(f.key, e.target.checked)} />
      {label}
    </label> : f.kind === 'select' ? <NativeSelect key={f.key} label={label} value={str(value)} choices={(f.choices ?? []).map(c => ({ value: c.value, label: t(c.label) }))} onChange={e => change(f.key, e.target.value)} /> : f.kind === 'textarea' ? <TextArea key={f.key} label={label} value={str(value)} maxLength={f.maxLength} required={f.required !== false} onChange={e => change(f.key, e.target.value)} /> : <TextInput key={f.key} label={label} type={f.kind ?? 'text'} value={str(value)} required={f.required !== false} min={dateMinimum ?? f.minDate ?? f.min} max={f.max} maxLength={f.maxLength} step={f.kind === 'number' ? 1 : undefined} onChange={e => change(f.key, e.target.value)} />;
  };
  const pairs: Record<string, string> = { startDate: 'endDate', checkIn: 'checkOut', startsAt: 'endsAt' };
  const renderedFields: ReactNode[] = [];
  for (let i = 0; i < action.fields.length; i++) {
    const f = action.fields[i];
    const next = action.fields[i + 1];
    if (next && pairs[f.key] === next.key && f.kind === next.kind && (f.kind === 'date' || f.kind === 'datetime-local')) {
      renderedFields.push(<div key={f.key} className="picker-pair"><div className="picker-pair-grid">{renderField(f)}{renderField(next, action.inclusiveEnd && f.key === 'startDate' ? str(values[f.key]) : nextPickerValue(str(values[f.key]), f.kind === 'datetime-local'))}</div></div>);
      i++;
    }
    else
      renderedFields.push(renderField(f));
  }
  return <Modal title={t(action.title)} width={action.confirmLabel || action.fields.length === 0 ? "md" : "lg"} onClose={() => {
    if (!lock.current)
      onClose();
  }}>
    <form className="live-form" onSubmit={submit}>
      {action.deleteTarget !== undefined && <DeleteConfirmation target={action.deleteTarget} />}
      {action.deleteTarget === undefined && (action.detail || action.fields.length === 0) && <p className="action-description">
        {t(action.detail ?? L(`Confirm: ${action.title.en.toLowerCase()}.`, `Xác nhận: ${action.title.vi.toLowerCase()}.`))}
      </p>}
      {renderedFields}
      {action.pricingPreview && <div className="pricing-preview"><strong>{t(L('Rate preview', 'Xem trước giá'))}</strong><span>{t(L('Applicable days', 'Số ngày áp dụng'))}: {Math.max(0, Math.floor((Date.parse(str(values.endDate)) - Date.parse(str(values.startDate))) / 86400000) + 1) || 0}</span><span>{t(L('Nightly rate', 'Giá mỗi đêm'))}: <Cash value={values.amountVnd} /></span></div>}
      <div className="live-actions">
        <Button type="button" variant="secondary" disabled={busy || generating} onClick={onClose}>
          {t(L('Cancel', 'Hủy'))}
        </Button>
        <Button type="submit" variant={action.danger ? 'danger' : 'primary'} disabled={busy || generating}>
          {t(busy ? L('Processing…', 'Đang xử lý…') : action.confirmLabel ?? L('Confirm', 'Xác nhận'))}
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
