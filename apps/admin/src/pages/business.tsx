import { mergePricingRates } from '../lib/pricing-table';
import { displayPickerValue, hotelNow, nextPickerValue } from '../lib/date-picker';
import { useState, type ReactNode } from 'react';
import { Badge, Button, Card, IconAction, Metric, Modal, NativeSelect, PageHeader, SearchBox, TextInput } from '../components/ui';
import { useAdminAuth } from '../lib/admin-auth';
import { L, nav, type Localized } from '../lib/domain';
import { useLocale } from '../lib/locale';
import { Cash, DataState, RowActions, StatusValue, Table, col, createDeleteAction, date, displayDate, field, num, obj, options, pathId, plusDays, rows, str, today, useAction, useData, type Action, type Field, type Row, type Values } from './business-ui';
const rcode = (r: Row) => str(r.code);
const text = (r: Row, key: string) => str(r[key]);
const amountField = field('amountVnd', 'Amount (VND)', 'Số tiền (VND)', { kind: 'money', min: 1, max: 2000000000 });
const reason = field('reason', 'Reason', 'Lý do', { kind: 'textarea', maxLength: 300 });
const dateFields = () => [field('checkIn', 'Check-in', 'Nhận phòng', { kind: 'date', initial: today() }), field('checkOut', 'Check-out', 'Trả phòng', { kind: 'date', initial: plusDays(today(), 1) })];
const statusCol = (key: string, en: string, vi: string) => col(key, en, vi, r => <StatusValue value={r[key]} />);
const cashCol = (key: string, en: string, vi: string) => col(key, en, vi, r => <Cash value={r[key]} />);
const dateCol = (key: string, en: string, vi: string) => col(key, en, vi, r => key.endsWith('At') && str(r[key]) && Number.isFinite(new Date(str(r[key])).valueOf()) ? displayDate(hotelNow(new Date(str(r[key])))) : displayDate(r[key]));
const dateTimeCol = (key: string, en: string, vi: string) => col(key, en, vi, r => {
  const instant = new Date(str(r[key]));
  return Number.isFinite(instant.valueOf()) ? displayPickerValue(hotelNow(instant), true) : '—';
});
const roomName = (r: Row, vi: boolean) => str(r[vi ? 'nameVi' : 'nameEn']) || str(r.nameEn) || str(r.code);
const typeChoices = (data: Row[], vi: boolean) => data.map(r => ({ value: rcode(r), label: roomName(r, vi) }));
const own = (v: Values, fields: Field[]) => Object.fromEntries(fields.filter(f => v[f.key] !== '' || f.required !== false).map(f => [f.key, (f.kind === 'number' || f.kind === 'money') ? Number(v[f.key]) : f.kind === 'datetime-local' ? new Date(`${v[f.key]}+07:00`).toISOString() : v[f.key]]));
function useOps(reload: () => void) {
  const { api, user } = useAdminAuth();
  const { t, language } = useLocale();
  const { open, dialog } = useAction(reload);
  const manager = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const action = (title: Localized, path: string, method: string, fields: Field[] = [], map?: (v: Values, id: string) => unknown, detail?: Localized, danger = false) => open({ title, fields, detail, danger, run: (v, id) => api(path, { method, body: map ? map(v, id) : own(v, fields) }) });
  return { api, t, vi: language === 'vi', manager, action, dialog, open };
}
function Frame({ path, reload, action, children }: {
  path: string;
  reload: () => void;
  action?: ReactNode;
  children: ReactNode;
}) {
  const { t } = useLocale();
  return <div className="page-stack">
    <PageHeader title={t(nav.find(n => n.path === path)!.label)} action={<RowActions>
      <Button variant="secondary" icon="refresh" onClick={reload}>
        {t(L('Refresh', 'Tải lại'))}
      </Button>
      {action}
    </RowActions>} />
    {children}
  </div>;
}
function Act({ label, onClick, danger = false }: {
  label: Localized;
  onClick: () => void;
  danger?: boolean;
}) {
  const { t } = useLocale();
  return <Button variant={danger ? 'danger' : 'secondary'} onClick={onClick}>
    {t(label)}
  </Button>;
}
function Hotel() {
  const d = useData<Row>('/admin/hotel');
  const inquiries = useData<Row[]>('/admin/hotel/inquiries');
  const o = useOps(() => {
    d.reload();
    inquiries.reload();
  });
  const f = (key: string, en: string, vi: string, kind: Field['kind'] = 'text', maxLength = 120) => field(key, en, vi, { kind, maxLength, initial: str(d.data?.[key]), required: false });
  const fields = [
    f('nameEn', 'Hotel name (EN)', 'Tên khách sạn (EN)'),
    f('nameVi', 'Hotel name (VI)', 'Tên khách sạn (VI)'),
    f('email', 'Contact email', 'Email liên hệ', 'email', 180),
    f('phone', 'Phone', 'Điện thoại', 'text', 32),
    f('address', 'Address', 'Địa chỉ', 'text', 300),
    f('descriptionEn', 'Description (EN)', 'Mô tả (EN)', 'textarea', 2000),
    f('descriptionVi', 'Description (VI)', 'Mô tả (VI)', 'textarea', 2000)
  ];
  return <Frame path="/hotel" reload={() => {
    d.reload();
    inquiries.reload();
  }}>
    <DataState {...d}>
      <Card title={o.t(L('Property information', 'Thông tin khách sạn'))} action={<Act label={L('Edit', 'Chỉnh sửa')} onClick={() => o.action(L('Edit hotel', 'Chỉnh sửa khách sạn'), '/admin/hotel', 'PATCH', fields, v => Object.fromEntries(Object.entries(v).filter(([k, val]) => k !== 'email' || val !== '')))} />}>
        <div className="live-details">
          {fields.map(f => <div key={f.key}>
            <span>
              {o.t(f.label)}
            </span>
            <strong>
              {str(d.data?.[f.key]) || '—'}
            </strong>
          </div>)}
          <div>
            <span>
              {o.t(L('Check-in / Check-out', 'Nhận / trả phòng'))}
            </span>
            <strong>{str(d.data?.checkInTime)} / {str(d.data?.checkOutTime)}</strong>
          </div>
        </div>
      </Card>
    </DataState>
    <DataState {...inquiries}>
      <Card title={o.t(L('Guest enquiries', 'Liên hệ của khách'))}>
        <Table data={rows(inquiries.data)} columns={[
          col('name', 'Name', 'Họ tên'),
          col('email', 'Email', 'Email'),
          col('topic', 'Subject', 'Chủ đề'),
          col('message', 'Message', 'Nội dung'),
          dateCol('createdAt', 'Received', 'Ngày nhận'),
          col('resolved', 'Handled', 'Đã xử lý', r => o.t(r.resolved ? L('Yes', 'Có') : L('No', 'Không'))),
          col('actions', 'Actions', 'Thao tác', r => !r.resolved && <Act label={L('Mark handled', 'Đánh dấu đã xử lý')} onClick={() => o.action(L('Mark enquiry handled', 'Đánh dấu đã xử lý'), `/admin/hotel/inquiries/${pathId(r.id)}/resolve`, 'PATCH', [], undefined, L('Mark this guest enquiry as handled.', 'Đánh dấu liên hệ này đã được xử lý.'))} />)
        ]} />
      </Card>
    </DataState>
    {o.dialog}
  </Frame>;
}
function RoomTypes() {
  const d = useData<Row[]>('/admin/room-types');
  const o = useOps(d.reload);
  const fields = (r: Row = {}) => [
    field('nameEn', 'Name (EN)', 'Tên (EN)', { initial: text(r, 'nameEn'), maxLength: 100 }),
    field('nameVi', 'Name (VI)', 'Tên (VI)', { initial: text(r, 'nameVi'), maxLength: 100 }),
    field('maxGuests', 'Maximum guests', 'Số khách tối đa', { kind: 'number', min: 1, max: 20, initial: num(r.maxGuests) || 2 }),
    ...(r.code ? [] : [{ ...amountField, key: 'baseRateVnd', label: L('Base nightly rate (VND)', 'Giá cơ bản / đêm (VND)') }]),
    field('sizeSqm', 'Size (m²)', 'Diện tích (m²)', { kind: 'number', min: 1, max: 10000, required: false, initial: text(r, 'sizeSqm') }),
    ...['beds', 'view', 'description'].flatMap(k => ['En', 'Vi'].map(l => field(k + l, `${k} (${l.toUpperCase()})`, `${k === 'beds' ? 'Giường' : k === 'view' ? 'Tầm nhìn' : 'Mô tả'} (${l.toUpperCase()})`, { initial: text(r, k + l), required: false, kind: k === 'description' ? 'textarea' : 'text', maxLength: k === 'description' ? 2000 : 100 }))),
    field('amenities', 'Amenities (one per line)', 'Tiện nghi (mỗi dòng một mục)', { kind: 'textarea', required: false, initial: Array.isArray(r.amenities) ? r.amenities.join('\n') : '' }),
    field('imageUrls', 'Room photos', 'Ảnh phòng', { kind: 'images', required: false, initial: Array.isArray(r.imageUrls) ? r.imageUrls.join('\n') : '' }),
    field('isPublished', 'Published', 'Công khai', { kind: 'check', required: false, initial: Boolean(r.isPublished) })
  ];
  const save = (r: Row = {}) => {
    const f = fields(r);
    o.action(r.code ? L('Edit room type', 'Sửa hạng phòng') : L('Add room type', 'Thêm hạng phòng'), `/admin/room-types${r.code ? '/' + pathId(r.code) : ''}`, r.code ? 'PATCH' : 'POST', f, v => ({ ...own(v, f), amenities: str(v.amenities).split('\n').map(x => x.trim()).filter(Boolean), imageUrls: str(v.imageUrls).split('\n').map(x => x.trim()).filter(Boolean) }));
  };
  return <Frame path="/room-types" reload={d.reload} action={<Button icon="plus" onClick={() => save()}>
    {o.t(L('Add room type', 'Thêm hạng phòng'))}
  </Button>}>
    <DataState {...d}>
      <Card>
        <Table data={rows(d.data)} columns={[
          col('code', 'Code', 'Mã'),
          col('name', 'Room type', 'Hạng phòng', r => roomName(r, o.vi)),
          col('maxGuests', 'Guests', 'Số khách'),
          col('sizeSqm', 'Size (m²)', 'Diện tích (m²)'),
          cashCol('baseRateVnd', 'Base rate', 'Giá cơ bản'),
          col('count', 'Physical rooms', 'Phòng vật lý', r => num(obj(r._count).physicalRooms)),
          col('isPublished', 'Status', 'Trạng thái', r => <Badge tone={r.isPublished ? 'success' : 'neutral'}>
            {o.t(r.isPublished ? L('Published', 'Công khai') : L('Draft', 'Bản nháp'))}
          </Badge>),
          col('action', 'Actions', 'Thao tác', r => <IconAction name="edit" label={o.t(L('Edit', 'Sửa'))} onClick={() => save(r)} />)
        ]} />
      </Card>
    </DataState>
    {o.dialog}
  </Frame>;
}
function Physical() {
  const d = useData<Row[]>('/admin/physical-rooms');
  const types = useData<Row[]>('/admin/room-types');
  const o = useOps(d.reload);
  return <Frame path="/physical-rooms" reload={() => {
    d.reload();
    types.reload();
  }} action={<Button icon="plus" disabled={!types.data?.length} onClick={() => o.action(L('Add physical room', 'Thêm phòng vật lý'), '/admin/physical-rooms', 'POST', [field('number', 'Room number', 'Số phòng', { maxLength: 20 }), field('roomTypeCode', 'Room type', 'Hạng phòng', { kind: 'select', choices: typeChoices(rows(types.data), o.vi) }), field('floor', 'Floor', 'Tầng', { kind: 'number', min: 0, max: 200 })])}>
    {o.t(L('Add room', 'Thêm phòng'))}
  </Button>}>
    <DataState {...d}>
      <Card>
        <Table data={rows(d.data)} columns={[
          col('number', 'Room', 'Phòng'),
          col('floor', 'Floor', 'Tầng'),
          col('type', 'Room type', 'Hạng phòng', r => roomName(obj(r.roomType), o.vi)),
          statusCol('cleaningStatus', 'Housekeeping', 'Buồng phòng'),
          col('sellable', 'Sellable', 'Mở bán', r => o.t(r.sellable ? L('Yes', 'Có') : L('No', 'Không'))),
          col('actions', 'Actions', 'Thao tác', r => <Act label={r.sellable ? L('Stop selling', 'Ngừng bán') : L('Enable selling', 'Mở bán')} onClick={() => o.action(L('Update room availability', 'Cập nhật mở bán'), `/admin/physical-rooms/${pathId(r.number)}`, 'PATCH', [], () => ({ sellable: !r.sellable }), r.sellable ? L(`Stop selling room ${str(r.number)}? Existing reservations may prevent this action.`, `Ngừng bán phòng ${str(r.number)}? Đặt phòng hiện tại có thể ngăn thao tác này.`) : L(`Enable room ${str(r.number)} for new bookings?`, `Mở bán phòng ${str(r.number)} cho đặt phòng mới?`))} />)
        ]} />
      </Card>
    </DataState>
    {o.dialog}
  </Frame>;
}
function Inventory() {
  const [from, setFrom] = useState(today());
  const [length, setLength] = useState(7);
  const to = plusDays(from, length);
  const d = useData<Row>(`/admin/inventory?checkIn=${from}&checkOut=${to}`);
  const o = useOps(d.reload);
  const rooms = rows(d.data?.rooms), bookings = rows(d.data?.bookings), blocks = rows(d.data?.blocks);
  const days = Array.from({ length }, (_, i) => plusDays(from, i));
  const [search, setSearch] = useState('');
  const cell = (r: Row, day: string) => {
    const b = bookings.find(b => b.roomId === r.id && ((date(b.checkIn) <= day && day < date(b.checkOut)) || (b.status === 'CHECKED_IN' && date(b.checkOut) <= today() && day >= today())));
    const block = blocks.find(b => b.roomId === r.id && date(b.startDate) <= day && day < date(b.endDate));
    const state = block ? 'MAINTENANCE' : b ? str(b.status) : !r.sellable ? 'BLOCKED' : day === today() && r.cleaningStatus === 'DIRTY' ? 'DIRTY' : 'AVAILABLE';
    return <span className={`live-slot live-slot-${state.toLowerCase()}`} title={str(b?.code) || str(block?.reason) || o.t(L('Room status', 'Trạng thái phòng'))}>
      <StatusValue value={state} />
    </span>;
  };
  return <Frame path="/inventory" reload={d.reload} action={o.manager && <Button icon="plus" disabled={!rooms.length} onClick={() => o.action(L('Block room for maintenance', 'Chặn phòng bảo trì'), '/admin/inventory/blocks', 'POST', [
    field('roomNumber', 'Room', 'Phòng', { kind: 'select', choices: rooms.map(r => ({ value: str(r.number), label: str(r.number) })) }),
    field('startDate', 'From', 'Từ ngày', { kind: 'date', initial: from }),
    field('endDate', 'Until (exclusive)', 'Đến ngày (không bao gồm)', { kind: 'date', initial: plusDays(from, 1) }),
    reason
  ])}>
    {o.t(L('Maintenance block', 'Chặn bảo trì'))}
  </Button>}>
    <Card>
      <div className="table-toolbar">
        <Button variant="secondary" onClick={() => setFrom(plusDays(from, -length))}>←</Button>
        <TextInput type="date" value={from} onChange={e => {
          if (e.target.value)
            setFrom(e.target.value);
        }} />
        <Button variant="secondary" onClick={() => setFrom(plusDays(from, length))}>→</Button>
        <NativeSelect value={String(length)} choices={[{ value: '7', label: '7 ' + o.t(L('days', 'ngày')) }, { value: '14', label: '14 ' + o.t(L('days', 'ngày')) }]} onChange={e => setLength(Number(e.target.value))} />
        <SearchBox value={search} onChange={setSearch} placeholder={o.t(L('Search room', 'Tìm phòng'))} />
      </div>
    </Card>
    <DataState {...d}>
      <Card title={o.t(L('Inventory calendar', 'Lịch tồn phòng'))}>
        <Table data={rooms.filter(r => str(r.number).includes(search))} columns={[col('number', 'Room', 'Phòng'), ...days.map(day => col(day, displayDate(day).slice(0, 5), displayDate(day).slice(0, 5), r => cell(r, day)))]} />
      </Card>
      <Card title={o.t(L('Maintenance blocks', 'Lịch bảo trì'))}>
        <Table data={blocks} columns={[
          col('room', 'Room', 'Phòng', r => str(rooms.find(x => x.id === r.roomId)?.number)),
          dateCol('startDate', 'From', 'Từ ngày'),
          dateCol('endDate', 'Until', 'Đến ngày'),
          col('reason', 'Reason', 'Lý do'),
          ...(o.manager ? [col('actions', 'Actions', 'Thao tác', r => <Act danger label={L('Remove block', 'Bỏ chặn')} onClick={() => o.action(L('Remove maintenance block', 'Bỏ chặn bảo trì'), `/admin/inventory/blocks/${pathId(r.id)}`, 'DELETE', [], undefined, L('This will release the blocked dates.', 'Các ngày bị chặn sẽ được giải phóng.'), true)} />)] : [])
        ]} />
      </Card>
    </DataState>
    {o.dialog}
  </Frame>;
}
function Pricing() {
  const d = useData<Row>('/admin/pricing');
  const [tab, setTab] = useState('base');
  const [month, setMonth] = useState(today().slice(0, 7));
  const [selectedType, setSelectedType] = useState('');
  const [calendarDetail, setCalendarDetail] = useState<Row | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const types = rows(d.data?.roomTypes);
  const code = types.some(r => rcode(r) === selectedType) ? selectedType : rcode(types[0] ?? {});
  const calendar = useData<Row[]>(tab === 'calendar' && code ? `/admin/pricing/calendar?roomTypeCode=${pathId(code)}&month=${pathId(month)}` : null);
  const reload = () => { d.reload(); calendar.reload(); };
  const o = useOps(reload);
  const weekend = obj(d.data?.weekend);
  // Keep legacy overrides accessible in the same table through their existing API.
  const rateRows = mergePricingRates(rows(d.data?.specialRates), rows(d.data?.dailyRates), types);
  const rateName = (r: Row) => r.legacyDaily ? o.t(L('Daily rate', 'Giá theo ngày')) : str(r.name);
  const feeOptions = [{ value: 'FIRST_NIGHT', label: L('First night', 'Đêm đầu') }, { value: 'FULL', label: L('Full room charge', 'Toàn bộ tiền phòng') }, { value: 'NONE', label: L('No fee', 'Không tính phí') }];
  const feeLabel = (value: unknown) => o.t(feeOptions.find(x => x.value === value)?.label ?? L('Unknown', 'Không xác định'));
  const editWeekend = () => o.action(L('Weekend pricing', 'Giá cuối tuần'), '/admin/pricing/weekend', 'PUT', [
    field('enabled', 'Enabled · Saturday and Sunday', 'Áp dụng · Thứ Bảy và Chủ nhật', { kind: 'check', required: false, initial: Boolean(weekend.enabled) }),
    field('surchargeVnd', 'Surcharge (VND)', 'Phụ thu (VND)', { kind: 'money', min: 0, initial: num(weekend.surchargeVnd) })
  ], undefined, L('The surcharge applies to future weekend nights unless a special rate exists.', 'Phụ thu áp dụng cho các đêm cuối tuần trong tương lai, trừ ngày có giá đặc biệt.'));
  const specialTypes = (r: Row) => rows(r.dailyRates).map(x => obj(x.roomType));
  const saveSpecial = (r?: Row) => {
    const assigned = r ? specialTypes(r) : [];
    const fields = [
      field('name', 'Rate name', 'Tên đợt giá', { maxLength: 120, initial: str(r?.name) }),
      field('roomTypeCode', 'Room type', 'Hạng phòng', { kind: 'select', choices: [{ value: '*', label: L(r ? 'Keep current group / all assigned rooms' : 'All room types', r ? 'Giữ nhóm hạng phòng hiện tại' : 'Tất cả hạng phòng') }, ...typeChoices(types, o.vi)], initial: r ? assigned.length === 1 ? rcode(assigned[0]) : '*' : '' }),
      field('startDate', 'Start date', 'Từ ngày', { kind: 'date', minDate: today(), initial: r ? date(r.startDate) : today() }),
      field('endDate', 'End date (inclusive)', 'Đến ngày (bao gồm)', { kind: 'date', minDate: today(), initial: r ? date(r.endDate) : today() }),
      { ...amountField, initial: r ? num(r.amountVnd) : undefined }
    ];
    o.open({ title: r ? L('Edit special rate', 'Sửa giá đặc biệt') : L('Create special rate', 'Tạo giá đặc biệt'), fields, inclusiveEnd: true, pricingPreview: true, detail: L('Set a nightly price for every selected date. Special rates replace base and weekend prices.', 'Đặt giá mỗi đêm cho toàn bộ khoảng ngày. Giá đặc biệt thay thế giá cơ bản và cuối tuần.'), run: v => o.api(r ? `/admin/pricing/special-rates/${pathId(r.id)}` : '/admin/pricing/special-rates', { method: r ? 'PATCH' : 'POST', body: own(v, fields) }) });
  };
  const editPlan = (r: Row) => {
    const flexible = r.code === 'FLEXIBLE';
    const fields = [field('discountPercent', 'Room discount (%)', 'Giảm giá phòng (%)', { kind: 'number', min: 0, max: 99, initial: num(r.discountPercent) }), ...(flexible ? [field('freeCancellationHours', 'Free cancellation before check-in (hours)', 'Miễn phí hủy trước nhận phòng (giờ)', { kind: 'number', min: 0, max: 8760, required: false, initial: r.freeCancellationHours == null ? '' : num(r.freeCancellationHours) }), field('lateFee', 'Late cancellation fee', 'Phí hủy muộn', { kind: 'select', choices: feeOptions, initial: str(r.lateFee) }), field('noShowFee', 'No-show fee', 'Phí không đến', { kind: 'select', choices: feeOptions, initial: str(r.noShowFee) })] : [field('active', 'Active', 'Hoạt động', { kind: 'check', required: false, initial: Boolean(r.active) })])];
    o.action(L('Edit rate plan', 'Sửa gói giá'), `/admin/pricing/rate-plans/${pathId(r.code)}`, 'PATCH', fields, v => ({ discountPercent: Number(v.discountPercent), freeCancellationHours: flexible && v.freeCancellationHours !== '' ? Number(v.freeCancellationHours) : null, lateFee: flexible ? v.lateFee : 'FULL', noShowFee: flexible ? v.noShowFee : 'FULL', active: flexible || Boolean(v.active) }), L('Changes apply to new bookings only. Leave cancellation hours blank to disable the free-cancellation window.', 'Chỉ áp dụng cho đặt phòng mới. Để trống số giờ nếu không có thời hạn miễn phí hủy.'));
  };
  const dayRate = (r: Row) => {
    const room = str(obj(r.roomType).code);
    o.action(L('Edit daily rate', 'Sửa giá theo ngày'), `/admin/pricing/room-types/${pathId(room)}/daily-rates`, 'POST', [{ ...amountField, initial: num(r.amountVnd) }], v => ({ date: date(r.date), amountVnd: Number(v.amountVnd) }), L(`Update the nightly price for ${displayDate(r.date)}.`, `Cập nhật giá đêm ${displayDate(r.date)}.`));
  };
  const shiftMonth = (delta: number) => {
    const value = new Date(`${month}-01T00:00:00Z`);
    value.setUTCMonth(value.getUTCMonth() + delta);
    setMonth(value.toISOString().slice(0, 7));
  };
  const calendarDays = rows(calendar.data);
  const firstDay = (new Date(`${month}-01T00:00:00Z`).getUTCDay() + 6) % 7;
  return <Frame path="/pricing" reload={reload}>
    <div className="compact-tabs" aria-label={o.t(L('Pricing sections', 'Các mục giá'))}>
      {[['base', 'Base rates', 'Giá cơ bản'], ['special', 'Special rates', 'Giá đặc biệt'], ['plans', 'Rate plans', 'Gói giá'], ['calendar', 'Rate calendar', 'Lịch giá']].map(([key, en, vi]) => <button type="button" key={key} aria-pressed={tab === key} onClick={() => setTab(key)}>{o.t(L(en, vi))}</button>)}
    </div>
    <DataState {...d}>
      {tab === 'base' && <>
        <Card title={o.t(L('Weekend pricing', 'Giá cuối tuần'))} action={<Act label={L('Edit settings', 'Chỉnh sửa')} onClick={editWeekend} />}>
          <div className="pricing-summary"><div><span>{o.t(L('Applicable days', 'Ngày áp dụng'))}</span><strong>{o.t(L('Saturday · Sunday', 'Thứ Bảy · Chủ nhật'))}</strong></div><div><span>{o.t(L('Surcharge / night', 'Phụ thu / đêm'))}</span><strong><Cash value={weekend.surchargeVnd} /></strong></div><div><span>{o.t(L('Status', 'Trạng thái'))}</span><strong>{o.t(weekend.enabled ? L('Enabled', 'Đang áp dụng') : L('Disabled', 'Đã tắt'))}</strong></div></div>
          <p className="pricing-note">{o.t(L('Special rates override both base rates and weekend surcharges.', 'Giá đặc biệt ưu tiên hơn giá cơ bản và phụ thu cuối tuần.'))}</p>
        </Card>
        <Card title={o.t(L('Room base rates', 'Giá cơ bản từng hạng phòng'))}><Table data={types} columns={[
          col('code', 'Code', 'Mã'), col('name', 'Room type', 'Hạng phòng', r => roomName(r, o.vi)), cashCol('baseRateVnd', 'Weekday / night', 'Ngày thường / đêm'), col('weekend', 'Weekend / night', 'Cuối tuần / đêm', r => <Cash value={num(r.baseRateVnd) + (weekend.enabled ? num(weekend.surchargeVnd) : 0)} />), col('actions', 'Actions', 'Thao tác', r => <IconAction name="edit" label={o.t(L('Edit', 'Chỉnh sửa'))} onClick={() => o.action(L('Set base rate', 'Đặt giá cơ bản'), `/admin/pricing/room-types/${pathId(r.code)}/base-rate`, 'PUT', [{ ...amountField, initial: num(r.baseRateVnd) }], undefined, L('Update the future base price without changing existing reservations.', 'Cập nhật giá cơ bản, không đổi giá booking đã tạo.'))} />)
        ]} /></Card>
      </>}
      {tab === 'special' && <>
        <Card title={o.t(L('Special rate periods', 'Đợt giá đặc biệt'))} action={<Button icon="plus" disabled={!types.length} onClick={() => saveSpecial()}>{o.t(L('Add special rate', 'Thêm giá đặc biệt'))}</Button>}>
          <div className="table-toolbar"><SearchBox value={search} onChange={setSearch} placeholder={o.t(L('Search special rates', 'Tìm đợt giá'))} /><NativeSelect value={filterType} choices={[{ value: '', label: o.t(L('All room types', 'Tất cả hạng phòng')) }, ...typeChoices(types, o.vi)]} onChange={e => setFilterType(e.target.value)} /></div>
          <Table data={rateRows.filter(r => rateName(r).toLowerCase().includes(search.toLowerCase()) && (!filterType || specialTypes(r).some(t => t.code === filterType)))} columns={[
            col('name', 'Rate name', 'Tên đợt giá', rateName),
            col('rooms', 'Room types', 'Hạng phòng', r => specialTypes(r).map(t => roomName(t, o.vi)).join(', ')),
            dateCol('startDate', 'Start', 'Bắt đầu'), dateCol('endDate', 'End (inclusive)', 'Kết thúc'), cashCol('amountVnd', 'Price / night', 'Giá / đêm'),
            col('actions', 'Actions', 'Thao tác', r => date(r.startDate) >= today() ? <RowActions>
              <IconAction name="edit" label={o.t(L('Edit rate', 'Sửa giá'))} onClick={() => r.legacyDaily ? dayRate(r) : saveSpecial(r)} />
              <IconAction name="trash" danger label={o.t(L('Delete rate', 'Xóa giá'))} onClick={() => o.open(createDeleteAction({
                title: r.legacyDaily ? L('Delete daily rate', 'Xóa giá theo ngày') : L('Delete special rate', 'Xóa giá đặc biệt'),
                target: r.legacyDaily ? `${roomName(specialTypes(r)[0] ?? {}, o.vi)} · ${displayDate(r.date)}` : str(r.name),
                run: () => o.api(r.legacyDaily ? `/admin/pricing/room-types/${pathId(obj(r.roomType).code)}/daily-rates/${pathId(date(r.date))}` : `/admin/pricing/special-rates/${pathId(r.id)}`, { method: 'DELETE' })
              }))} />
            </RowActions> : '—')
          ]} />
        </Card>
      </>}
      {tab === 'plans' && <div className="pricing-plan-grid">{rows(d.data?.plans).map(r => <Card key={rcode(r)} title={o.t(L(r.code === 'FLEXIBLE' ? 'Flexible' : 'Non-refundable', r.code === 'FLEXIBLE' ? 'Linh hoạt' : 'Không hoàn tiền'))} action={<Act label={L('Edit policy', 'Sửa chính sách')} onClick={() => editPlan(r)} />}>
        <div className="pricing-plan-discount">{num(r.discountPercent)}%</div><p className="pricing-note">{o.t(L('Room rate discount', 'Giảm giá phòng'))}</p>
        <div className="pricing-policy-list"><div><span>{o.t(L('Free cancellation', 'Miễn phí hủy'))}</span><strong>{r.freeCancellationHours == null ? o.t(L('Not available', 'Không áp dụng')) : `${r.freeCancellationHours} ${o.t(L('hours before check-in', 'giờ trước nhận phòng'))}`}</strong></div><div><span>{o.t(L('Late cancellation', 'Hủy muộn'))}</span><strong>{feeLabel(r.lateFee)}</strong></div><div><span>{o.t(L('No-show fee', 'Phí không đến'))}</span><strong>{feeLabel(r.noShowFee)}</strong></div><div><span>{o.t(L('Status', 'Trạng thái'))}</span><strong>{o.t(r.active ? L('Active', 'Hoạt động') : L('Inactive', 'Đã tắt'))}</strong></div></div>
      </Card>)}</div>}
      {tab === 'calendar' && <Card title={o.t(L('Rate calendar', 'Lịch giá'))}>
        <div className="pricing-calendar-toolbar"><div className="live-actions"><Button variant="secondary" onClick={() => shiftMonth(-1)}>←</Button><strong>{month.split('-').reverse().join('/')}</strong><Button variant="secondary" onClick={() => shiftMonth(1)}>→</Button></div><NativeSelect value={code} choices={typeChoices(types, o.vi)} onChange={e => setSelectedType(e.target.value)} /></div>
        <p className="pricing-note">{o.t(L('Flexible nightly price preview, not historical booking revenue.', 'Xem trước giá Linh hoạt mỗi đêm, không phải doanh thu booking lịch sử.'))}</p>
        <div className="pricing-legend">{[['BASE', 'Base', 'Cơ bản'], ['WEEKEND', 'Weekend', 'Cuối tuần'], ['SPECIAL', 'Special', 'Đặc biệt']].map(([key, en, vi]) => <span key={key} className={`pricing-cell-${key.toLowerCase()}`}>{o.t(L(en, vi))}</span>)}</div>
        {code ? <DataState {...calendar}><div className="pricing-calendar-scroll"><div className="pricing-calendar">
          {(o.vi ? ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] : ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']).map(day => <span key={day} className="pricing-weekday">{day}</span>)}
          {Array.from({ length: firstDay }, (_, i) => <div key={`empty-${i}`} />)}
          {calendarDays.map(r => <button type="button" className={`pricing-day pricing-cell-${str(r.source).toLowerCase()}`} key={str(r.date)} onClick={() => setCalendarDetail(r)}><span>{date(r.date).slice(-2)}</span><strong><Cash value={r.flexibleVnd} /></strong></button>)}
        </div></div></DataState> : <p>{o.t(L('No room types.', 'Chưa có hạng phòng.'))}</p>}
      </Card>}
    </DataState>{o.dialog}
    {calendarDetail && <Modal title={o.t(L('Nightly rate', 'Giá mỗi đêm'))} onClose={() => setCalendarDetail(null)} footer={<Button onClick={() => setCalendarDetail(null)}>{o.t(L('Close', 'Đóng'))}</Button>}>
      <div className="pricing-policy-list"><p className="action-description">{displayDate(calendarDetail.date)} · {roomName(types.find(r => rcode(r) === code) ?? {}, o.vi)}</p>
        {[[L('Base rate', 'Giá cơ bản'), 'baseRateVnd'], [L('Weekend surcharge (if no special rate)', 'Phụ thu cuối tuần (nếu không có giá đặc biệt)'), 'weekendSurchargeVnd'], [L('Special rate', 'Giá đặc biệt'), 'specialRateVnd'], [L('Applied rate before discount', 'Giá áp dụng trước giảm'), 'amountVnd'], [L('Flexible', 'Linh hoạt'), 'flexibleVnd'], [L('Non-refundable', 'Không hoàn tiền'), 'nonRefundableVnd']].map(([label, key]) => <div key={String(key)}><span>{o.t(label as Localized)}</span><strong>{calendarDetail[String(key)] == null ? '—' : <Cash value={calendarDetail[String(key)]} />}</strong></div>)}
        {str(calendarDetail.name) && <p className="pricing-note">{str(calendarDetail.name)}</p>}</div>
    </Modal>}
  </Frame>;
}
const bookingCols = [
  col('code', 'Reference', 'Mã đặt phòng'),
  col('guest', 'Guest', 'Khách', r => str(obj(r.guest).name)),
  col('roomType', 'Room type', 'Hạng phòng', r => str(obj(r.roomType).nameEn) || str(obj(r.roomType).code)),
  col('room', 'Room', 'Phòng', r => str(obj(r.room).number)),
  dateCol('checkIn', 'Check-in', 'Nhận phòng'),
  dateCol('checkOut', 'Check-out', 'Trả phòng'),
  statusCol('status', 'Status', 'Trạng thái'),
  cashCol('totalVnd', 'Total', 'Tổng tiền')
];
function Reservations() {
  const d = useData<Row[]>('/admin/reservations');
  const types = useData<Row[]>('/rooms');
  const plans = useData<Row[]>('/rate-plans');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [detail, setDetail] = useState('');
  const selected = useData<Row>(detail ? `/admin/reservations/${pathId(detail)}` : null);
  const o = useOps(() => {
    d.reload();
    selected.reload();
  });
  const createFields = [
    field('roomTypeCode', 'Room type', 'Hạng phòng', { kind: 'select', choices: typeChoices(rows(types.data), o.vi) }),
    field('adults', 'Adults', 'Người lớn', { kind: 'number', min: 1, max: 20, initial: 2 }),
    field('children', 'Children', 'Trẻ em', { kind: 'number', min: 0, max: 20, initial: 0 }),
    field('guestName', 'Guest name', 'Tên khách', { maxLength: 120 }),
    field('guestEmail', 'Email', 'Email', { kind: 'email' }),
    field('guestPhone', 'Phone', 'Điện thoại', { required: false, maxLength: 32 }),
    ...dateFields(),
    field('specialRequests', 'Special requests', 'Yêu cầu đặc biệt', { required: false, kind: 'textarea', maxLength: 500 }),
    field('ratePlan', 'Rate plan', 'Gói giá', { kind: 'select', initial: 'FLEXIBLE', choices: options(rows(plans.data).map(r => rcode(r))) }),
    field('guaranteeMode', 'Reservation mode', 'Hình thức đặt', { kind: 'select', initial: 'PAY_AT_HOTEL', choices: [{ value: 'PAY_AT_HOTEL', label: L('Confirmed – pay at hotel', 'Xác nhận – trả tại khách sạn') }, { value: 'HOLD', label: L('15-minute hold', 'Giữ chỗ 15 phút') }] }),
    field('promotionCode', 'Promotion code', 'Mã ưu đãi', { required: false }),
    field('acceptedTerms', 'Guest agreed to the booking terms', 'Khách đã đồng ý điều khoản', { kind: 'check' })
  ];
  const create = () => o.open({
    title: L('Create reservation', 'Tạo đặt phòng'), fields: createFields, detail: L('Create a reservation using current room availability and rate policies. Confirm the selected terms with the guest.', 'Tạo đặt phòng theo tồn phòng và gói giá hiện tại. Xác nhận điều khoản đã chọn với khách.'), run: async (v, id) => {
      const payload = own(v, createFields);
      if (payload.promotionCode)
        payload.promotionCode = str(payload.promotionCode).trim().toUpperCase();
      await o.api('/admin/reservations', { method: 'POST', body: { ...payload, clientRequestId: id } });
    }
  });
  const actions = (r: Row) => <RowActions>
    <Act label={L('Details', 'Chi tiết')} onClick={() => setDetail(rcode(r))} />
    {r.status === 'PENDING' && <Act label={L('Confirm hold', 'Xác nhận giữ chỗ')} onClick={() => o.action(L('Confirm reservation', 'Xác nhận đặt phòng'), `/admin/reservations/${pathId(r.code)}/confirm`, 'POST', [], undefined, L('Confirm only after verifying the guarantee.', 'Chỉ xác nhận sau khi kiểm tra bảo đảm.'))} />}
    {['PENDING', 'CONFIRMED'].includes(str(r.status)) && <Act danger label={L('Cancel', 'Hủy')} onClick={() => o.action(L('Cancel reservation', 'Hủy đặt phòng'), `/admin/reservations/${pathId(r.code)}/cancel`, 'POST', [reason], undefined, L('Cancellation fees are calculated by the server. Refunds are separate.', 'Phí hủy do máy chủ tính. Hoàn tiền là giao dịch riêng.'), true)} />}
  </RowActions>;
  return <Frame path="/reservations" reload={d.reload} action={<Button icon="plus" disabled={!types.data?.length || !plans.data?.length} onClick={create}>
    {o.t(L('New reservation', 'Tạo đặt phòng'))}
  </Button>}>
    <DataState {...d}>
      <Card>
        <div className="table-toolbar">
          <SearchBox value={search} onChange={setSearch} placeholder={o.t(L('Search booking or guest', 'Tìm mã đặt hoặc tên khách'))} />
          <NativeSelect value={status} choices={[{ value: '', label: o.t(L('All statuses', 'Tất cả trạng thái')) }, ...options(['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW', 'EXPIRED']).map(x => ({ value: x.value, label: o.t(x.label) }))]} onChange={e => setStatus(e.target.value)} />
        </div>
        <Table data={rows(d.data).filter(r => (!status || r.status === status) && `${r.code} ${obj(r.guest).name} ${obj(r.guest).email}`.toLowerCase().includes(search.toLowerCase()))} columns={[...bookingCols, col('actions', 'Actions', 'Thao tác', actions)]} />
      </Card>
    </DataState>
    {detail && <DataState {...selected}>
      <Card title={`${o.t(L('Reservation', 'Đặt phòng'))} ${detail}`} action={<Act label={L('Close', 'Đóng')} onClick={() => setDetail('')} />}>
        <div className="live-details">
          {bookingCols.map(c => <div key={c.key}>
            <span>
              {o.t(c.label)}
            </span>
            <strong>
              {c.render?.(obj(selected.data)) ?? str(selected.data?.[c.key])}
            </strong>
          </div>)}
          <div>
            <span>
              {o.t(L('Special requests', 'Yêu cầu đặc biệt'))}
            </span>
            <strong>
              {str(selected.data?.specialRequests) || '—'}
            </strong>
          </div>
        </div>
      </Card>
    </DataState>}
    {o.dialog}
  </Frame>;
}
function FrontDesk() {
  const d = useData<Row>('/admin/front-desk');
  const o = useOps(d.reload);
  const [tab, setTab] = useState('arrivals');
  const act = (r: Row) => {
    const base = `/admin/front-desk/reservations/${pathId(r.code)}`;
    return <RowActions>
      <Act label={L('Assign / transfer', 'Gán / chuyển phòng')} onClick={() => o.action(L('Assign physical room', 'Gán phòng vật lý'), `${base}/assign-room`, 'POST', [field('roomNumber', 'Inspected room number', 'Số phòng đã kiểm tra', { initial: str(obj(r.room).number) }), reason])} />
      {r.status === 'CONFIRMED' ? <>
        <Act label={L('Check in', 'Nhận phòng')} onClick={() => o.action(L('Check in guest', 'Nhận phòng cho khách'), `${base}/check-in`, 'POST', [], undefined, L('Verify the guest identity and inspected room before confirming.', 'Kiểm tra danh tính khách và phòng đã kiểm tra trước khi xác nhận.'))} />
        <Act label={L('Late arrival', 'Đến muộn')} onClick={() => o.action(L('Expected arrival (hotel time)', 'Giờ đến dự kiến (giờ khách sạn)'), `${base}/late-arrival`, 'POST', [field('expectedArrivalAt', 'Expected arrival (UTC+7)', 'Dự kiến đến (UTC+7)', { kind: 'datetime-local' }), reason])} />
        {date(r.checkIn) < today() && <Act danger label={L('No-show', 'Không đến')} onClick={() => o.action(L('Record no-show', 'Ghi nhận không đến'), `${base}/no-show`, 'POST', [reason], undefined, L('Only after the cutoff. Fees and inventory release are handled by the server.', 'Chỉ sau hạn đến. Máy chủ tính phí và giải phóng phòng.'), true)} />}
      </> : <Act label={L('Check out', 'Trả phòng')} onClick={() => o.action(L('Check out guest', 'Trả phòng cho khách'), `${base}/check-out`, 'POST', [], undefined, L('Settle the folio and all service orders first.', 'Hoàn tất công nợ và tất cả yêu cầu dịch vụ trước.'))} />}
      <Act label={L('Extend stay', 'Gia hạn')} onClick={() => o.action(L('Extend stay', 'Gia hạn lưu trú'), `${base}/extend`, 'POST', [field('checkOut', 'New check-out', 'Ngày trả phòng mới', { kind: 'date', initial: plusDays(date(r.checkOut), 1) })])} />
    </RowActions>;
  };
  return <Frame path="/front-desk" reload={d.reload}>
    <DataState {...d}>
      <div className="metric-grid three">
        {[['arrivals', 'Arrivals / overdue', 'Khách đến / quá hạn'], ['inHouse', 'In-house', 'Đang lưu trú'], ['departures', 'Departures / overdue', 'Khách đi / quá hạn']].map(([key, en, vi]) => <Metric key={key} label={o.t(L(en, vi))} value={rows(d.data?.[key]).length} icon="key" />)}
      </div>
      <Card>
        <div className="compact-tabs front-desk-tabs">
          {[['arrivals', 'Arrivals', 'Khách đến'], ['inHouse', 'In-house', 'Đang lưu trú'], ['departures', 'Departures', 'Khách đi']].map(([key, en, vi]) => <button type="button" key={key} aria-pressed={tab === key} onClick={() => setTab(key)}>
            {o.t(L(en, vi))}
          </button>)}
        </div>
        <Table data={rows(d.data?.[tab])} columns={[...bookingCols, col('actions', 'Actions', 'Thao tác', act)]} />
      </Card>
    </DataState>
    {o.dialog}
  </Frame>;
}
function Payments() {
  const ledger = useData<Row[]>('/admin/payments');
  const bookings = useData<Row[]>('/admin/reservations');
  const services = useData<Row[]>('/admin/promotions/services');
  const [code, setCode] = useState('');
  const folio = useData<Row>(code ? `/admin/payments/reservations/${pathId(code)}/folio` : null);
  const o = useOps(() => {
    ledger.reload();
    bookings.reload();
    folio.reload();
  });
  const b = folio.data;
  const base = `/admin/payments/reservations/${pathId(code)}`;
  const serviceBase = '/admin/promotions';
  const payment = (refund: boolean) => o.action(refund ? L('Record refund', 'Ghi nhận hoàn tiền') : L('Record payment', 'Ghi nhận thu tiền'), `${base}/${refund ? 'manual-refund' : 'manual-payment'}`, 'POST', [
    { ...amountField, initial: Math.abs(num(b?.balanceVnd)) },
    field('method', 'Method', 'Phương thức', { kind: 'select', choices: options(['CASH', 'BANK_TRANSFER']), initial: 'CASH' }),
    field('reference', 'Bank reference (required for transfer)', 'Mã giao dịch (bắt buộc khi chuyển khoản)', { required: false, maxLength: 120 }),
    field('note', 'Note', 'Ghi chú', { required: false, maxLength: 300 }),
    field('completed', refund ? 'Actual refund completed' : 'Actual payment received', refund ? 'Đã thực hiện hoàn tiền' : 'Đã thực nhận tiền', { kind: 'check' })
  ], (v, id) => ({
    amountVnd: Number(v.amountVnd),
    method: v.method,
    idempotencyKey: id,
    ...(v.reference ? { reference: v.reference } : {}),
    ...(v.note ? { note: v.note } : {}),
    ...(refund ? { externallyCompleted: true } : {})
  }), L('Records a real external cash/bank transaction; does not transfer money.', 'Chỉ ghi nhận giao dịch tiền mặt/chuyển khoản thực tế, không chuyển tiền.'));
  return <Frame path="/payments" reload={() => {
    ledger.reload();
    bookings.reload();
    folio.reload();
    services.reload();
  }}>
    <Card title={o.t(L('Reservation folio', 'Công nợ đặt phòng'))}>
      <NativeSelect label={o.t(L('Reservation', 'Đặt phòng'))} value={code} choices={rows(bookings.data).map(r => ({ value: rcode(r), label: `${r.code} · ${obj(r.guest).name}` }))} onChange={e => setCode(e.target.value)} />
      {code && <DataState {...folio}>
        {b && <>
          <div className="metric-grid three">
            <Metric label={o.t(L('Due', 'Phải thu'))} value={<Cash value={b.dueVnd} />} />
            <Metric label={o.t(L('Net received', 'Đã thu ròng'))} value={<Cash value={b.netReceived} />} />
            <Metric label={o.t(L('Balance', 'Còn phải thu'))} value={<Cash value={b.balanceVnd} />} />
          </div>
          <RowActions>
            {num(b.balanceVnd) > 0 && b.bookingStatus !== 'EXPIRED' && <Act label={L('Record payment', 'Ghi nhận thu tiền')} onClick={() => payment(false)} />}
            {o.manager && num(b.balanceVnd) < 0 && <Act label={L('Record refund', 'Ghi nhận hoàn tiền')} onClick={() => payment(true)} />}
            {o.manager && !['CANCELLED', 'NO_SHOW', 'EXPIRED', 'CHECKED_OUT'].includes(str(b.bookingStatus)) && <Act label={L('Adjust folio', 'Điều chỉnh công nợ')} onClick={() => o.action(L('Adjust folio', 'Điều chỉnh công nợ'), `${base}/adjustments`, 'POST', [{ ...amountField, min: -2000000000 }, reason], (v, id) => ({ amountVnd: Number(v.amountVnd), reason: v.reason, idempotencyKey: id }))} />}
            {['CONFIRMED', 'CHECKED_IN'].includes(str(b.bookingStatus)) && <Act label={L('Add extra service', 'Thêm dịch vụ')} onClick={() => o.action(L('Order extra service', 'Đặt dịch vụ'), `${serviceBase}/reservations/${pathId(code)}/services`, 'POST', [field('serviceCode', 'Service', 'Dịch vụ', { kind: 'select', choices: rows(services.data).filter(r => r.isActive).map(r => ({ value: rcode(r), label: str(r.name) })) }), field('quantity', 'Quantity', 'Số lượng', { kind: 'number', min: 1, max: 30, initial: 1 })], (v, id) => ({ serviceCode: v.serviceCode, quantity: Number(v.quantity), clientRequestId: id }))} />}
          </RowActions>
          <Table data={rows(b.services)} columns={[
            col('service', 'Service', 'Dịch vụ', r => str(obj(r.service).name)),
            col('quantity', 'Quantity', 'Số lượng'),
            cashCol('totalVnd', 'Total', 'Tổng'),
            statusCol('status', 'Status', 'Trạng thái'),
            col('actions', 'Actions', 'Thao tác', r => r.status === 'REQUESTED' && <RowActions>
              {['fulfill', 'cancel'].map(kind => <Act key={kind} label={kind === 'fulfill' ? L('Fulfill', 'Đã cung cấp') : L('Cancel', 'Hủy')} onClick={() => o.action(kind === 'fulfill' ? L('Fulfill service', 'Cung cấp dịch vụ') : L('Cancel service', 'Hủy dịch vụ'), `${serviceBase}/orders/${pathId(r.id)}/${kind}`, 'POST')} />)}
            </RowActions>)
          ]} />
          <Table data={rows(b.adjustments)} columns={[cashCol('amountVnd', 'Adjustment', 'Điều chỉnh'), col('reason', 'Reason', 'Lý do'), dateCol('createdAt', 'Date', 'Ngày')]} />
        </>}
      </DataState>}
    </Card>
    <DataState {...ledger}>
      <Card title={o.t(L('Transaction ledger', 'Sổ giao dịch'))}>
        <Table data={rows(ledger.data)} columns={[
          col('booking', 'Reservation', 'Đặt phòng', r => str(obj(r.booking).code)),
          statusCol('kind', 'Kind', 'Loại'),
          statusCol('method', 'Method', 'Phương thức'),
          cashCol('amountVnd', 'Amount', 'Số tiền'),
          col('reference', 'Reference', 'Mã giao dịch'),
          dateCol('createdAt', 'Date', 'Ngày')
        ]} />
      </Card>
    </DataState>
    {o.dialog}
  </Frame>;
}
function Housekeeping() {
  const d = useData<Row[]>('/admin/housekeeping');
  const o = useOps(d.reload);
  return <Frame path="/housekeeping" reload={d.reload}>
    <DataState {...d}>
      <div className="metric-grid three">
        {['DIRTY', 'CLEAN', 'INSPECTED'].map(s => <Metric key={s} label={o.t(L(s === 'DIRTY' ? 'Dirty' : s === 'CLEAN' ? 'Clean' : 'Inspected', s === 'DIRTY' ? 'Cần dọn' : s === 'CLEAN' ? 'Đã dọn' : 'Đã kiểm tra'))} value={rows(d.data).filter(r => r.cleaningStatus === s).length} icon="sparkles" />)}
      </div>
      <Card>
        <Table data={rows(d.data)} columns={[
          col('number', 'Room', 'Phòng'),
          col('floor', 'Floor', 'Tầng'),
          statusCol('cleaningStatus', 'Status', 'Trạng thái'),
          col('actions', 'Actions', 'Thao tác', r => <RowActions>
            {(r.cleaningStatus === 'DIRTY' ? ['CLEAN'] : r.cleaningStatus === 'CLEAN' ? ['DIRTY', 'INSPECTED'] : ['DIRTY']).map(s => <Act key={s} label={s === 'CLEAN' ? L('Mark clean', 'Đã dọn') : s === 'INSPECTED' ? L('Inspect', 'Đã kiểm tra') : L('Mark dirty', 'Cần dọn')} onClick={() => o.action(L('Update housekeeping', 'Cập nhật buồng phòng'), `/admin/housekeeping/rooms/${pathId(r.number)}`, 'PATCH', [], () => ({ status: s }), L(`Mark room ${str(r.number)} as ${s.toLowerCase()}?`, `Xác nhận phòng ${str(r.number)} ${s === 'CLEAN' ? 'đã dọn' : s === 'INSPECTED' ? 'đã kiểm tra' : 'cần dọn'}?`))} />)}
          </RowActions>)
        ]} />
      </Card>
    </DataState>
    {o.dialog}
  </Frame>;
}
function Guests() {
  const d = useData<Row[]>('/admin/guests');
  const reviews = useData<Row[]>('/admin/guests/reviews');
  const o = useOps(() => {
    d.reload();
    reviews.reload();
  });
  const [query, setQuery] = useState('');
  return <Frame path="/guests" reload={() => {
    d.reload();
    reviews.reload();
  }}>
    <DataState {...d}>
      <Card title={o.t(L('Guest directory', 'Danh sách khách'))}>
        <SearchBox value={query} onChange={setQuery} placeholder={o.t(L('Find guest', 'Tìm khách'))} />
        <Table data={rows(d.data).filter(r => `${r.name} ${r.email}`.toLowerCase().includes(query.toLowerCase()))} columns={[
          col('name', 'Name', 'Họ tên'),
          col('email', 'Email', 'Email'),
          col('phone', 'Phone', 'Điện thoại'),
          col('stays', 'Completed stays', 'Lượt lưu trú hoàn tất'),
          col('bookings', 'Reservations', 'Đặt phòng', r => rows(r.bookings).map(b => str(b.code)).join(', '))
        ]} />
      </Card>
    </DataState>
    <DataState {...reviews}>
      <Card title={o.t(L('Verified stay reviews', 'Đánh giá lưu trú xác thực'))}>
        <Table data={rows(reviews.data)} columns={[
          col('guest', 'Guest', 'Khách', r => str(obj(obj(r.booking).guest).name)),
          col('stars', 'Stars', 'Sao'),
          col('comment', 'Review', 'Đánh giá'),
          col('response', 'Response', 'Phản hồi'),
          col('isVisible', 'Visible', 'Hiển thị', r => o.t(r.isVisible ? L('Yes', 'Có') : L('No', 'Không'))),
          ...(o.manager ? [col('actions', 'Actions', 'Thao tác', r => <Act label={L('Moderate', 'Duyệt / phản hồi')} onClick={() => o.action(L('Moderate review', 'Duyệt đánh giá'), `/admin/guests/reviews/${pathId(r.id)}`, 'PATCH', [field('response', 'Response', 'Phản hồi', { kind: 'textarea', initial: str(r.response), maxLength: 2000, required: false }), field('isVisible', 'Publish review', 'Công khai đánh giá', { kind: 'check', required: false, initial: Boolean(r.isVisible) })], v => ({ response: v.response, isVisible: v.isVisible }))} />)] : [])
        ]} />
      </Card>
    </DataState>
    {o.dialog}
  </Frame>;
}
function Promotions() {
  const d = useData<Row>('/admin/promotions');
  const o = useOps(d.reload);
  const promotionFields = (r?: Row): Field[] => [
    ...(!r ? [field('code', 'Promotion code', 'Mã ưu đãi', { kind: 'promotion-code', required: false, maxLength: 32 })] : []),
    field('discountPercent', 'Discount (%)', 'Giảm (%)', { kind: 'number', min: 1, max: 30, initial: r ? num(r.discountPercent) : undefined }),
    field('startsAt', 'Start (UTC+7)', 'Bắt đầu (UTC+7)', { kind: 'datetime-local', initial: r ? hotelNow(new Date(str(r.startsAt))) : undefined }),
    field('endsAt', 'End (UTC+7)', 'Kết thúc (UTC+7)', { kind: 'datetime-local', initial: r ? hotelNow(new Date(str(r.endsAt))) : undefined }),
    field('usageLimit', 'Usage limit', 'Giới hạn lượt dùng', { kind: 'number', min: Math.max(1, num(r?.usageCount)), max: 2000000000, initial: r ? num(r.usageLimit) : undefined }),
    field('isActive', 'Active', 'Hoạt động', { kind: 'check', required: false, initial: r ? Boolean(r.isActive) : true }),
  ];
  const serviceFields = (r?: Row): Field[] => [
    field('name', 'Service name (EN)', 'Tên dịch vụ (EN)', { maxLength: 120, initial: str(r?.name) }),
    field('nameVi', 'Service name (VI)', 'Tên dịch vụ (VI)', { maxLength: 120, initial: str(r?.nameVi), required: false }),
    field('unit', 'Unit (EN)', 'Đơn vị (EN)', { maxLength: 40, initial: str(r?.unit) }),
    field('unitVi', 'Unit (VI)', 'Đơn vị (VI)', { maxLength: 40, initial: str(r?.unitVi), required: false }),
    { ...amountField, key: 'priceVnd', min: 0, initial: r ? num(r.priceVnd) : undefined },
    field('eyebrowEn', 'Subtitle (EN)', 'Tiêu đề phụ (EN)', { maxLength: 120, initial: str(r?.eyebrowEn), required: false }),
    field('eyebrowVi', 'Subtitle (VI)', 'Tiêu đề phụ (VI)', { maxLength: 120, initial: str(r?.eyebrowVi), required: false }),
    field('descriptionEn', 'Description (EN)', 'Mô tả (EN)', { kind: 'textarea', maxLength: 2000, initial: str(r?.descriptionEn), required: false }),
    field('descriptionVi', 'Description (VI)', 'Mô tả (VI)', { kind: 'textarea', maxLength: 2000, initial: str(r?.descriptionVi), required: false }),
    field('imageUrl', 'Service cover image', 'Ảnh đại diện dịch vụ', { kind: 'service-image', initial: str(r?.imageUrl), required: false }),
    field('isActive', 'Active', 'Hoạt động', { kind: 'check', required: false, initial: r ? Boolean(r.isActive) : true }),
  ];
  const promotionPath = (r: Row) => `/admin/promotions/${pathId(r.code)}`;
  const servicePath = (r: Row) => `/admin/promotions/services/${pathId(r.code)}`;
  const serviceName = (r: Row) => (o.vi ? str(r.nameVi) : '') || str(r.name);
  const serviceUnit = (r: Row) => (o.vi ? str(r.unitVi) : '') || str(r.unit);
  const saveService = (r?: Row) => {
    const fields = serviceFields(r);
    o.action(r ? L('Edit extra service', 'Chỉnh sửa dịch vụ') : L('Create extra service', 'Tạo dịch vụ'), r ? servicePath(r) : '/admin/promotions/services', r ? 'PATCH' : 'POST', fields, v => ({
      ...own(v, fields),
      // Empty optional fields must be sent as null to clear saved values.
      ...Object.fromEntries(['nameVi', 'unitVi', 'eyebrowEn', 'eyebrowVi', 'descriptionEn', 'descriptionVi', 'imageUrl'].map(key => [key, str(v[key]).trim() || null])),
    }));
  };
  const remove = (r: Row, service: boolean) => {
    const name = str(r.name) || rcode(r);
    const target = service ? L(name, str(r.nameVi) || name) : rcode(r);
    o.open(createDeleteAction({
      title: service ? L('Delete extra service', 'Xóa dịch vụ bổ sung') : L('Delete promotion', 'Xóa ưu đãi'),
      target,
      run: () => o.api(service ? servicePath(r) : promotionPath(r), { method: 'DELETE' }),
    }));
  };
  const active = (r: Row) => o.t(r.isActive ? L('Yes', 'Có') : L('No', 'Không'));
  return <Frame path="/promotions" reload={d.reload}>
    <DataState {...d}>
      <Card title={o.t(L('Promotion codes', 'Mã ưu đãi'))} action={o.manager && <Button icon="plus" onClick={() => o.action(L('Create promotion', 'Tạo ưu đãi'), '/admin/promotions', 'POST', promotionFields())}>{o.t(L('Add promotion', 'Thêm ưu đãi'))}</Button>}>
        <Table data={rows(d.data?.promotions)} columns={[
          col('code', 'Code', 'Mã'),
          col('discountPercent', 'Discount (%)', 'Giảm (%)'),
          dateTimeCol('startsAt', 'Start', 'Bắt đầu'),
          dateTimeCol('endsAt', 'End', 'Kết thúc'),
          col('usageCount', 'Used', 'Đã dùng'),
          col('usageLimit', 'Limit', 'Giới hạn'),
          col('isActive', 'Active', 'Hoạt động', active),
          ...(o.manager ? [col('actions', 'Actions', 'Thao tác', r => <RowActions>
            <IconAction name="edit" label={o.t(L('Edit', 'Sửa'))} onClick={() => o.action(L('Edit promotion', 'Chỉnh sửa ưu đãi'), promotionPath(r), 'PATCH', promotionFields(r), undefined, L(`Promotion code: ${rcode(r)} (cannot be changed).`, `Mã ưu đãi: ${rcode(r)} (không thể thay đổi).`))} />
            <IconAction name="trash" danger label={o.t(L('Delete', 'Xóa'))} onClick={() => remove(r, false)} />
          </RowActions>)] : []),
        ]} />
      </Card>
      <Card title={o.t(L('Extra services', 'Dịch vụ bổ sung'))} action={o.manager && <Button icon="plus" onClick={() => saveService()}>{o.t(L('Add service', 'Thêm dịch vụ'))}</Button>}>
        <Table data={rows(d.data?.extraServices)} columns={[
          col('code', 'Code', 'Mã'),
          col('name', 'Name', 'Tên', serviceName),
          col('unit', 'Unit', 'Đơn vị', serviceUnit),
          cashCol('priceVnd', 'Price', 'Giá'),
          col('isActive', 'Active', 'Hoạt động', active),
          ...(o.manager ? [col('actions', 'Actions', 'Thao tác', r => <RowActions>
            <IconAction name="edit" label={o.t(L('Edit', 'Sửa'))} onClick={() => saveService(r)} />
            <IconAction name="trash" danger label={o.t(L('Delete', 'Xóa'))} onClick={() => remove(r, true)} />
          </RowActions>)] : []),
        ]} />
      </Card>
    </DataState>
    {o.dialog}
  </Frame>;
}
function Reports() {
  const { t } = useLocale();
  const [range, setRange] = useState({ from: today().slice(0, 7) + '-01', to: plusDays(today(), 1) });
  const [filter, setFilter] = useState(range);
  const d = useData<Row>(`/admin/reports?from=${filter.from}&to=${filter.to}`);
  const data = d.data;
  const metrics: [
    string,
    Localized,
    boolean
  ][] = [
      ['availableRoomNights', L('Available room-nights', 'Đêm phòng có thể bán'), false],
      ['soldNights', L('Booked room-nights', 'Đêm phòng đã đặt'), false],
      ['roomRevenueVnd', L('Booked room revenue', 'Doanh thu phòng đã đặt'), true],
      ['cashCollectedVnd', L('Net payments', 'Tiền thu ròng'), true],
      ['occupancyPercent', L('Booked occupancy (%)', 'Công suất đặt (%)'), false],
      ['adrVnd', L('ADR', 'ADR'), true],
      ['revparVnd', L('RevPAR', 'RevPAR'), true]
    ];
  return <Frame path="/reports" reload={d.reload}>
    <Card>
      <form className="table-toolbar" onSubmit={e => {
        e.preventDefault();
        if (range.from && range.to > range.from)
          setFilter({ ...range });
      }}>
        <TextInput type="date" label={t(L('From', 'Từ ngày'))} value={range.from} onChange={e => setRange(v => ({ ...v, from: e.target.value }))} />
        <TextInput type="date" label={t(L('To (exclusive)', 'Đến (không bao gồm)'))} value={range.to} min={nextPickerValue(range.from, false)} onChange={e => setRange(v => ({ ...v, to: e.target.value }))} />
        <Button type="submit">
          {t(L('Apply period', 'Áp dụng kỳ'))}
        </Button>
      </form>
    </Card>
    <DataState {...d}>
      <div className="metric-grid three">
        {metrics.map(([key, label, money]) => <Metric key={key} label={t(label)} value={data ? (money ? <Cash value={data[key]} /> : str(data[key])) : '—'} icon="chart" />)}
      </div>
      <Card>
        <p>
          {t(L('Booked room revenue is not recognized accounting revenue. Net payments are actual recorded receipts less refunds by transaction date. Occupancy uses current sellable inventory and recorded maintenance blocks.', 'Doanh thu phòng đã đặt không phải doanh thu kế toán đã ghi nhận. Tiền thu ròng là số thu thực tế trừ hoàn tiền theo ngày giao dịch. Công suất dựa trên tồn phòng mở bán hiện tại và lịch bảo trì.'))}
        </p>
      </Card>
    </DataState>
  </Frame>;
}
export function BusinessPage({ path }: {
  path: string;
}) {
  switch (path) {
    case '/hotel': return <Hotel />;
    case '/room-types': return <RoomTypes />;
    case '/physical-rooms': return <Physical />;
    case '/inventory': return <Inventory />;
    case '/pricing': return <Pricing />;
    case '/reservations': return <Reservations />;
    case '/front-desk': return <FrontDesk />;
    case '/payments': return <Payments />;
    case '/housekeeping': return <Housekeeping />;
    case '/guests': return <Guests />;
    case '/promotions': return <Promotions />;
    case '/reports': return <Reports />;
    default: return null;
  }
}
