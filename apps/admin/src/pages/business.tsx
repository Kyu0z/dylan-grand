import { useState, type ReactNode } from 'react';
import { Badge, Button, Card, Metric, NativeSelect, PageHeader, SearchBox, TextInput } from '../components/ui';
import { useAdminAuth } from '../lib/admin-auth';
import { L, nav, type Localized } from '../lib/domain';
import { useLocale } from '../lib/locale';
import { Cash, DataState, RowActions, StatusValue, Table, col, date, field, num, obj, options, pathId, plusDays, rows, str, today, useAction, useData, type Action, type Field, type Row, type Values } from './business-ui';
const rcode = (r: Row) => str(r.code);
const text = (r: Row, key: string) => str(r[key]);
const amountField = field('amountVnd', 'Amount (VND)', 'Số tiền (VND)', { kind: 'number', min: 1, max: 2000000000 });
const reason = field('reason', 'Reason', 'Lý do', { kind: 'textarea', maxLength: 300 });
const dateFields = () => [field('checkIn', 'Check-in', 'Nhận phòng', { kind: 'date', initial: today() }), field('checkOut', 'Check-out', 'Trả phòng', { kind: 'date', initial: plusDays(today(), 1) })];
const statusCol = (key: string, en: string, vi: string) => col(key, en, vi, r => <StatusValue value={r[key]} />);
const cashCol = (key: string, en: string, vi: string) => col(key, en, vi, r => <Cash value={r[key]} />);
const dateCol = (key: string, en: string, vi: string) => col(key, en, vi, r => date(r[key]));
const roomName = (r: Row, vi: boolean) => str(r[vi ? 'nameVi' : 'nameEn']) || str(r.nameEn) || str(r.code);
const typeChoices = (data: Row[], vi: boolean) => data.map(r => ({ value: rcode(r), label: roomName(r, vi) }));
const own = (v: Values, fields: Field[]) => Object.fromEntries(fields.filter(f => v[f.key] !== '' || f.required !== false).map(f => [f.key, f.kind === 'number' ? Number(v[f.key]) : f.kind === 'datetime-local' ? new Date(`${v[f.key]}+07:00`).toISOString() : v[f.key]]));
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
      <Button
        variant="secondary"
        icon="refresh"
        onClick={reload}
      >
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
          col('actions', 'Actions', 'Thao tác', r => !r.resolved && <Act label={L('Mark handled', 'Đánh dấu đã xử lý')} onClick={() => o.action(L('Mark enquiry handled', 'Đánh dấu đã xử lý'), `/admin/hotel/inquiries/${pathId(r.id)}/resolve`, 'PATCH')} />)
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
    ...(r.code ? [] : [field('code', 'Code (lowercase)', 'Mã (chữ thường)', { maxLength: 40 })]),
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
  return <Frame
    path="/room-types"
    reload={d.reload}
    action={<Button icon="plus" onClick={() => save()}>
      {o.t(L('Add room type', 'Thêm hạng phòng'))}
    </Button>}
  >
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
          col('action', 'Actions', 'Thao tác', r => <Act label={L('Edit', 'Sửa')} onClick={() => save(r)} />)
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
  return <Frame
    path="/physical-rooms"
    reload={() => {
      d.reload();
      types.reload();
    }}
    action={<Button
      icon="plus"
      disabled={!types.data?.length}
      onClick={() => o.action(L('Add physical room', 'Thêm phòng vật lý'), '/admin/physical-rooms', 'POST', [field('number', 'Room number', 'Số phòng', { maxLength: 20 }), field('roomTypeCode', 'Room type', 'Hạng phòng', { kind: 'select', choices: typeChoices(rows(types.data), o.vi) }), field('floor', 'Floor', 'Tầng', { kind: 'number', min: 0, max: 200 })])}
    >
      {o.t(L('Add room', 'Thêm phòng'))}
    </Button>}
  >
    <DataState {...d}>
      <Card>
        <Table data={rows(d.data)} columns={[
          col('number', 'Room', 'Phòng'),
          col('floor', 'Floor', 'Tầng'),
          col('type', 'Room type', 'Hạng phòng', r => roomName(obj(r.roomType), o.vi)),
          statusCol('cleaningStatus', 'Housekeeping', 'Buồng phòng'),
          col('sellable', 'Sellable', 'Mở bán', r => o.t(r.sellable ? L('Yes', 'Có') : L('No', 'Không'))),
          col('actions', 'Actions', 'Thao tác', r => <Act label={r.sellable ? L('Stop selling', 'Ngừng bán') : L('Enable selling', 'Mở bán')} onClick={() => o.action(L('Update room availability', 'Cập nhật mở bán'), `/admin/physical-rooms/${pathId(r.number)}`, 'PATCH', [], () => ({ sellable: !r.sellable }), L('Existing reservations may prevent disabling this room.', 'Đặt phòng hiện tại có thể ngăn việc ngừng bán phòng.'))} />)
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
  return <Frame
    path="/inventory"
    reload={d.reload}
    action={o.manager && <Button
      icon="plus"
      disabled={!rooms.length}
      onClick={() => o.action(L('Block room for maintenance', 'Chặn phòng bảo trì'), '/admin/inventory/blocks', 'POST', [
        field('roomNumber', 'Room', 'Phòng', { kind: 'select', choices: rooms.map(r => ({ value: str(r.number), label: str(r.number) })) }),
        field('startDate', 'From', 'Từ ngày', { kind: 'date', initial: from }),
        field('endDate', 'Until (exclusive)', 'Đến ngày (không bao gồm)', { kind: 'date', initial: plusDays(from, 1) }),
        reason
      ])}
    >
      {o.t(L('Maintenance block', 'Chặn bảo trì'))}
    </Button>}
  >
    <Card>
      <div className="table-toolbar">
        <Button variant="secondary" onClick={() => setFrom(plusDays(from, -length))}>←</Button>
        <TextInput
          type="date"
          value={from}
          onChange={e => {
            if (e.target.value)
              setFrom(e.target.value);
          }}
        />
        <Button variant="secondary" onClick={() => setFrom(plusDays(from, length))}>→</Button>
        <NativeSelect
          value={String(length)}
          choices={[{ value: '7', label: '7 ' + o.t(L('days', 'ngày')) }, { value: '14', label: '14 ' + o.t(L('days', 'ngày')) }]}
          onChange={e => setLength(Number(e.target.value))}
        />
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder={o.t(L('Search room', 'Tìm phòng'))}
        />
      </div>
    </Card>
    <DataState {...d}>
      <Card title={o.t(L('Inventory calendar', 'Lịch tồn phòng'))}>
        <Table data={rooms.filter(r => str(r.number).includes(search))} columns={[col('number', 'Room', 'Phòng'), ...days.map(day => col(day, day.slice(5), day.slice(5), r => cell(r, day)))]} />
      </Card>
      <Card title={o.t(L('Maintenance blocks', 'Lịch bảo trì'))}>
        <Table data={blocks} columns={[
          col('room', 'Room', 'Phòng', r => str(rooms.find(x => x.id === r.roomId)?.number)),
          dateCol('startDate', 'From', 'Từ ngày'),
          dateCol('endDate', 'Until', 'Đến ngày'),
          col('reason', 'Reason', 'Lý do'),
          ...(o.manager ? [col('actions', 'Actions', 'Thao tác', r => <Act
            danger
            label={L('Remove block', 'Bỏ chặn')}
            onClick={() => o.action(L('Remove maintenance block', 'Bỏ chặn bảo trì'), `/admin/inventory/blocks/${pathId(r.id)}`, 'DELETE', [], undefined, L('This will release the blocked dates.', 'Các ngày bị chặn sẽ được giải phóng.'), true)}
          />)] : [])
        ]} />
      </Card>
    </DataState>
    {o.dialog}
  </Frame>;
}
function Pricing() {
  const d = useData<Row>('/admin/pricing');
  const o = useOps(d.reload);
  const types = rows(d.data?.roomTypes);
  return <Frame path="/pricing" reload={d.reload}>
    <DataState {...d}>
      <Card title={o.t(L('Base rates', 'Giá cơ bản'))}>
        <Table data={types} columns={[
          col('code', 'Code', 'Mã'),
          col('name', 'Room type', 'Hạng phòng', r => roomName(r, o.vi)),
          cashCol('baseRateVnd', 'Rate / night', 'Giá / đêm'),
          col('actions', 'Actions', 'Thao tác', r => <RowActions>
            <Act label={L('Base rate', 'Giá cơ bản')} onClick={() => o.action(L('Set base rate', 'Đặt giá cơ bản'), `/admin/pricing/room-types/${pathId(r.code)}/base-rate`, 'PUT', [{ ...amountField, initial: num(r.baseRateVnd) }])} />
            <Act label={L('Daily rate', 'Giá theo ngày')} onClick={() => o.action(L('Set daily rate', 'Đặt giá theo ngày'), `/admin/pricing/room-types/${pathId(r.code)}/daily-rates`, 'POST', [field('date', 'Date', 'Ngày', { kind: 'date', initial: today() }), { ...amountField, initial: num(r.baseRateVnd) }])} />
          </RowActions>)
        ]} />
      </Card>
      <Card title={o.t(L('Daily overrides', 'Giá theo ngày'))}>
        <Table data={rows(d.data?.dailyRates)} columns={[col('roomType', 'Room type', 'Hạng phòng', r => str(obj(r.roomType).code)), dateCol('date', 'Date', 'Ngày'), cashCol('amountVnd', 'Rate', 'Giá')]} />
      </Card>
      <Card title={o.t(L('Rate policies', 'Chính sách giá'))}>
        <p>
          {o.t(L('Flexible: free cancellation until 48 hours before 14:00 hotel-local check-in; then one night. Non-refundable: 10% lower rate, full room obligation on cancellation.', 'Linh hoạt: miễn phí hủy đến 48 giờ trước 14:00 ngày nhận phòng; sau đó tính một đêm. Không hoàn tiền: giảm 10% giá phòng, tính toàn bộ tiền phòng khi hủy.'))}
        </p>
      </Card>
    </DataState>
    {o.dialog}
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
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [detail, setDetail] = useState('');
  const selected = useData<Row>(detail ? `/admin/reservations/${pathId(detail)}` : null);
  const o = useOps(() => {
    d.reload();
    selected.reload();
  });
  const createFields = [
    ...dateFields(),
    field('roomTypeCode', 'Room type', 'Hạng phòng', { kind: 'select', choices: typeChoices(rows(types.data), o.vi) }),
    field('adults', 'Adults', 'Người lớn', { kind: 'number', min: 1, max: 20, initial: 2 }),
    field('children', 'Children', 'Trẻ em', { kind: 'number', min: 0, max: 20, initial: 0 }),
    field('guestName', 'Guest name', 'Tên khách', { maxLength: 120 }),
    field('guestEmail', 'Email', 'Email', { kind: 'email' }),
    field('guestPhone', 'Phone', 'Điện thoại', { required: false, maxLength: 32 }),
    field('specialRequests', 'Special requests', 'Yêu cầu đặc biệt', { required: false, kind: 'textarea', maxLength: 500 }),
    field('ratePlan', 'Rate plan', 'Gói giá', { kind: 'select', initial: 'FLEXIBLE', choices: options(['FLEXIBLE', 'NON_REFUNDABLE']) }),
    field('guaranteeMode', 'Reservation mode', 'Hình thức đặt', { kind: 'select', initial: 'PAY_AT_HOTEL', choices: [{ value: 'PAY_AT_HOTEL', label: L('Confirmed – pay at hotel', 'Xác nhận – trả tại khách sạn') }, { value: 'HOLD', label: L('15-minute hold', 'Giữ chỗ 15 phút') }] }),
    field('promotionCode', 'Promotion code', 'Mã ưu đãi', { required: false }),
    field('acceptedTerms', 'Guest agreed to the booking terms', 'Khách đã đồng ý điều khoản', { kind: 'check' })
  ];
  const create = () => o.open({
    title: L('Create reservation', 'Tạo đặt phòng'), fields: createFields, run: async (v, id) => {
      const payload = own(v, createFields);
      if (payload.promotionCode)
        payload.promotionCode = str(payload.promotionCode).trim().toUpperCase();
      await o.api('/admin/reservations', { method: 'POST', body: { ...payload, clientRequestId: id } });
    }
  });
  const actions = (r: Row) => <RowActions>
    <Act label={L('Details', 'Chi tiết')} onClick={() => setDetail(rcode(r))} />
    {r.status === 'PENDING' && <Act label={L('Confirm hold', 'Xác nhận giữ chỗ')} onClick={() => o.action(L('Confirm reservation', 'Xác nhận đặt phòng'), `/admin/reservations/${pathId(r.code)}/confirm`, 'POST', [], undefined, L('Confirm only after verifying the guarantee.', 'Chỉ xác nhận sau khi kiểm tra bảo đảm.'))} />}
    {['PENDING', 'CONFIRMED'].includes(str(r.status)) && <Act
      danger
      label={L('Cancel', 'Hủy')}
      onClick={() => o.action(L('Cancel reservation', 'Hủy đặt phòng'), `/admin/reservations/${pathId(r.code)}/cancel`, 'POST', [reason], undefined, L('Cancellation fees are calculated by the server. Refunds are separate.', 'Phí hủy do máy chủ tính. Hoàn tiền là giao dịch riêng.'), true)}
    />}
  </RowActions>;
  return <Frame
    path="/reservations"
    reload={d.reload}
    action={<Button
      icon="plus"
      disabled={!types.data?.length}
      onClick={create}
    >
      {o.t(L('New reservation', 'Tạo đặt phòng'))}
    </Button>}
  >
    <DataState {...d}>
      <Card>
        <div className="table-toolbar">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder={o.t(L('Search booking or guest', 'Tìm mã đặt hoặc tên khách'))}
          />
          <NativeSelect
            value={status}
            choices={[{ value: '', label: o.t(L('All statuses', 'Tất cả trạng thái')) }, ...options(['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW', 'EXPIRED']).map(x => ({ value: x.value, label: o.t(x.label) }))]}
            onChange={e => setStatus(e.target.value)}
          />
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
        {date(r.checkIn) < today() && <Act
          danger
          label={L('No-show', 'Không đến')}
          onClick={() => o.action(L('Record no-show', 'Ghi nhận không đến'), `${base}/no-show`, 'POST', [reason], undefined, L('Only after the cutoff. Fees and inventory release are handled by the server.', 'Chỉ sau hạn đến. Máy chủ tính phí và giải phóng phòng.'), true)}
        />}
      </> : <Act label={L('Check out', 'Trả phòng')} onClick={() => o.action(L('Check out guest', 'Trả phòng cho khách'), `${base}/check-out`, 'POST', [], undefined, L('Settle the folio and all service orders first.', 'Hoàn tất công nợ và tất cả yêu cầu dịch vụ trước.'))} />}
      <Act label={L('Extend stay', 'Gia hạn')} onClick={() => o.action(L('Extend stay', 'Gia hạn lưu trú'), `${base}/extend`, 'POST', [field('checkOut', 'New check-out', 'Ngày trả phòng mới', { kind: 'date', initial: plusDays(date(r.checkOut), 1) })])} />
    </RowActions>;
  };
  return <Frame path="/front-desk" reload={d.reload}>
    <DataState {...d}>
      <div className="metric-grid three">
        {[['arrivals', 'Arrivals / overdue', 'Khách đến / quá hạn'], ['inHouse', 'In-house', 'Đang lưu trú'], ['departures', 'Departures / overdue', 'Khách đi / quá hạn']].map(([key, en, vi]) => <Metric
          key={key}
          label={o.t(L(en, vi))}
          value={rows(d.data?.[key]).length}
          icon="key"
        />)}
      </div>
      <Card>
        <div className="table-toolbar">
          {[['arrivals', 'Arrivals', 'Khách đến'], ['inHouse', 'In-house', 'Đang lưu trú'], ['departures', 'Departures', 'Khách đi']].map(([key, en, vi]) => <Button
            key={key}
            variant={tab === key ? 'primary' : 'secondary'}
            onClick={() => setTab(key)}
          >
            {o.t(L(en, vi))}
          </Button>)}
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
      <NativeSelect
        label={o.t(L('Reservation', 'Đặt phòng'))}
        value={code}
        choices={rows(bookings.data).map(r => ({ value: rcode(r), label: `${r.code} · ${obj(r.guest).name}` }))}
        onChange={e => setCode(e.target.value)}
      />
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
              {['fulfill', 'cancel'].map(kind => <Act
                key={kind}
                label={kind === 'fulfill' ? L('Fulfill', 'Đã cung cấp') : L('Cancel', 'Hủy')}
                onClick={() => o.action(kind === 'fulfill' ? L('Fulfill service', 'Cung cấp dịch vụ') : L('Cancel service', 'Hủy dịch vụ'), `${serviceBase}/orders/${pathId(r.id)}/${kind}`, 'POST')}
              />)}
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
        {['DIRTY', 'CLEAN', 'INSPECTED'].map(s => <Metric
          key={s}
          label={o.t(L(s === 'DIRTY' ? 'Dirty' : s === 'CLEAN' ? 'Clean' : 'Inspected', s === 'DIRTY' ? 'Cần dọn' : s === 'CLEAN' ? 'Đã dọn' : 'Đã kiểm tra'))}
          value={rows(d.data).filter(r => r.cleaningStatus === s).length}
          icon="sparkles"
        />)}
      </div>
      <Card>
        <Table data={rows(d.data)} columns={[
          col('number', 'Room', 'Phòng'),
          col('floor', 'Floor', 'Tầng'),
          statusCol('cleaningStatus', 'Status', 'Trạng thái'),
          col('actions', 'Actions', 'Thao tác', r => <RowActions>
            {(r.cleaningStatus === 'DIRTY' ? ['CLEAN'] : r.cleaningStatus === 'CLEAN' ? ['DIRTY', 'INSPECTED'] : ['DIRTY']).map(s => <Act
              key={s}
              label={s === 'CLEAN' ? L('Mark clean', 'Đã dọn') : s === 'INSPECTED' ? L('Inspect', 'Đã kiểm tra') : L('Mark dirty', 'Cần dọn')}
              onClick={() => o.action(L('Update housekeeping', 'Cập nhật buồng phòng'), `/admin/housekeeping/rooms/${pathId(r.number)}`, 'PATCH', [], () => ({ status: s }))}
            />)}
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
        <SearchBox
          value={query}
          onChange={setQuery}
          placeholder={o.t(L('Find guest', 'Tìm khách'))}
        />
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
  return <Frame path="/promotions" reload={d.reload}>
    <DataState {...d}>
      <Card title={o.t(L('Promotion codes', 'Mã ưu đãi'))} action={<Button icon="plus" onClick={() => o.action(L('Create promotion', 'Tạo ưu đãi'), '/admin/promotions', 'POST', [
        field('code', 'Code (uppercase)', 'Mã (chữ hoa)'),
        field('discountPercent', 'Discount (%)', 'Giảm (%)', { kind: 'number', min: 1, max: 30 }),
        field('startsAt', 'Start (UTC+7)', 'Bắt đầu (UTC+7)', { kind: 'datetime-local' }),
        field('endsAt', 'End (UTC+7)', 'Kết thúc (UTC+7)', { kind: 'datetime-local' }),
        field('usageLimit', 'Usage limit', 'Giới hạn lượt dùng', { kind: 'number', min: 1, max: 2000000000 })
      ])}>
        {o.t(L('Add promotion', 'Thêm ưu đãi'))}
      </Button>}>
        <Table data={rows(d.data?.promotions)} columns={[
          col('code', 'Code', 'Mã'),
          col('discountPercent', 'Discount (%)', 'Giảm (%)'),
          dateCol('startsAt', 'Start', 'Bắt đầu'),
          dateCol('endsAt', 'End', 'Kết thúc'),
          col('usageCount', 'Used', 'Đã dùng'),
          col('usageLimit', 'Limit', 'Giới hạn'),
          col('isActive', 'Active', 'Hoạt động', r => o.t(r.isActive ? L('Yes', 'Có') : L('No', 'Không'))),
          col('actions', 'Actions', 'Thao tác', r => <Act label={r.isActive ? L('Deactivate', 'Tắt') : L('Activate', 'Bật')} onClick={() => o.action(L('Change promotion status', 'Đổi trạng thái ưu đãi'), `/admin/promotions/${pathId(r.code)}/active`, 'PATCH', [], () => ({ isActive: !r.isActive }))} />)
        ]} />
      </Card>
      <Card title={o.t(L('Extra services', 'Dịch vụ bổ sung'))} action={<Button icon="plus" onClick={() => o.action(L('Create extra service', 'Tạo dịch vụ'), '/admin/promotions/services', 'POST', [
        field('code', 'Code (uppercase)', 'Mã (chữ hoa)'),
        field('name', 'Service name', 'Tên dịch vụ', { maxLength: 120 }),
        field('unit', 'Unit', 'Đơn vị', { maxLength: 40 }),
        { ...amountField, key: 'priceVnd', min: 0 }
      ])}>
        {o.t(L('Add service', 'Thêm dịch vụ'))}
      </Button>}>
        <Table data={rows(d.data?.extraServices)} columns={[
          col('code', 'Code', 'Mã'),
          col('name', 'Name', 'Tên'),
          col('unit', 'Unit', 'Đơn vị'),
          cashCol('priceVnd', 'Price', 'Giá'),
          col('isActive', 'Active', 'Hoạt động', r => o.t(r.isActive ? L('Yes', 'Có') : L('No', 'Không'))),
          col('actions', 'Actions', 'Thao tác', r => <Act label={r.isActive ? L('Deactivate', 'Tắt') : L('Activate', 'Bật')} onClick={() => o.action(L('Change service status', 'Đổi trạng thái dịch vụ'), `/admin/promotions/services/${pathId(r.code)}/active`, 'PATCH', [], () => ({ isActive: !r.isActive }))} />)
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
        if (range.to > range.from)
          setFilter({ ...range });
      }}>
        <TextInput
          type="date"
          label={t(L('From', 'Từ ngày'))}
          value={range.from}
          onChange={e => setRange(v => ({ ...v, from: e.target.value }))}
        />
        <TextInput
          type="date"
          label={t(L('To (exclusive)', 'Đến (không bao gồm)'))}
          value={range.to}
          onChange={e => setRange(v => ({ ...v, to: e.target.value }))}
        />
        <Button type="submit">
          {t(L('Apply period', 'Áp dụng kỳ'))}
        </Button>
      </form>
    </Card>
    <DataState {...d}>
      <div className="metric-grid three">
        {metrics.map(([key, label, money]) => <Metric
          key={key}
          label={t(label)}
          value={data ? (money ? <Cash value={data[key]} /> : str(data[key])) : '—'}
          icon="chart"
        />)}
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
