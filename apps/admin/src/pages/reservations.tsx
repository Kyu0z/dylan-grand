import { useMemo, useState, type FormEvent } from 'react';
import { L, formatDate, formatMoney, type Reservation } from '../lib/domain';
import { useLocale } from '../lib/locale';
import { useDemoStore } from '../lib/demo-store';
import { Button, Card, IconAction, Modal, NativeSelect, PageHeader, SearchBox, Status, Tabs, TextArea, TextInput, useToast } from '../components/ui';

const statusOptions = ['Pending', 'Confirmed', 'Checked-in', 'Checked-out', 'Cancelled', 'No-show', 'Expired'];
const bookingEmpty: Reservation = { id: '', guest: '', email: '', roomType: 'Deluxe Room', room: '', checkIn: '2026-11-21', checkOut: '2026-11-23', status: 'Pending', payment: 'Unpaid', total: 3700000, channel: 'Walk-in', notes: '' };
export function ReservationsPage() {
  const { t, language } = useLocale();
  const { bookings, roomTypes, rooms, update } = useDemoStore();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('All');
  const [start, setStart] = useState('');
  const [selected, setSelected] = useState<Reservation | null>(null);
  const [draft, setDraft] = useState<Reservation | null>(null);
  const { notify, Toast } = useToast();
  const counts = Object.fromEntries(statusOptions.map(s => [s, bookings.filter(b => b.status === s).length]));
  const filtered = useMemo(() => bookings.filter(b => (b.id + b.guest + b.email).toLowerCase().includes(query.toLowerCase()) && (tab === 'All' || b.status === tab) && (!start || b.checkIn >= start)), [bookings, query, tab, start]);
  const openNew = () => setDraft({ ...bookingEmpty, id: `DGH-${Date.now().toString().slice(-6)}` });
  const save = (event: FormEvent) => { event.preventDefault(); if (!draft) return; if (draft.checkOut <= draft.checkIn) { notify(t(L('Check-out must be after check-in.', 'Ngày trả phòng phải sau ngày nhận phòng.'))); return; } update('bookings', bookings.some(b => b.id === draft.id) ? bookings.map(b => b.id === draft.id ? draft : b) : [draft, ...bookings]); setDraft(null); setSelected(null); notify(t(L('This module is not available yet.', 'Chức năng này hiện chưa khả dụng.'))); };
  const changeStatus = (value: string) => { if (!selected) return; const next = { ...selected, status: value }; update('bookings', bookings.map(b => b.id === selected.id ? next : b)); setSelected(next); notify(t(L('This module is not available yet.', 'Chức năng này hiện chưa khả dụng.'))); };
  const csv = () => { const header = ['ID', 'Guest', 'Email', 'Room Type', 'Room', 'Check In', 'Check Out', 'Status', 'Payment', 'Total']; const lines = [header, ...filtered.map(b => [b.id, b.guest, b.email, b.roomType, b.room, b.checkIn, b.checkOut, b.status, b.payment, String(b.total)])]; const csvData = lines.map(line => line.map(value => '"' + String(value).replaceAll('"', '""') + '"').join(',')).join('\r\n'); const url = URL.createObjectURL(new Blob(['\ufeff', csvData], { type: 'text/csv;charset=utf-8;' })); const link = document.createElement('a'); link.href = url; link.download = 'dylan-grand-reservations.csv'; link.click(); URL.revokeObjectURL(url); };
  return <div className="page-stack">
    <PageHeader
      
      title={t(L('Reservation management', 'Quản lý đặt phòng'))}
      description={t(L('Every guest journey, carefully organized.', 'Theo dõi và quản lý mọi hành trình lưu trú của khách.'))}
      action={<>
        <Button variant="secondary" icon="download" onClick={csv}>
          {t(L('Export CSV', 'Xuất CSV'))}
        </Button>
        <Button icon="plus" onClick={openNew}>
          {t(L('New reservation', 'Tạo booking'))}
        </Button>
      </>} />
    <div className="metric-grid four">
      <div className="metric compact">
        <span>
          {t(L('All bookings', 'Tổng booking'))}
        </span>
        <strong>
          {bookings.length}
        </strong>
      </div>
      <div className="metric compact">
        <span>
          {t(L('Confirmed', 'Đã xác nhận'))}
        </span>
        <strong>
          {counts.Confirmed}
        </strong>
      </div>
      <div className="metric compact">
        <span>
          {t(L('Pending', 'Đang chờ'))}
        </span>
        <strong>
          {counts.Pending}
        </strong>
      </div>
      <div className="metric compact">
        <span>
          {t(L('In-house guests', 'Khách đang lưu trú'))}
        </span>
        <strong>
          {counts['Checked-in']}
        </strong>
      </div>
    </div>
    <Card>
      <div className="table-toolbar split">
        <SearchBox value={query} onChange={setQuery} placeholder={t(L('Search guest, booking ID or email…', 'Tìm tên khách, mã đặt phòng hoặc email…'))} />
        <TextInput type="date" value={start} onChange={e => setStart(e.target.value)} aria-label={t(L('From check-in date', 'Từ ngày nhận phòng'))} />
      </div>
      <Tabs
        items={[{ id: 'All', label: t(L('All reservations', 'Tất cả')) }, ...['Pending', 'Confirmed', 'Checked-in', 'Cancelled'].map(s => ({ id: s, label: s === 'Pending' ? t(L('Pending', 'Đang chờ')) : s === 'Confirmed' ? t(L('Confirmed', 'Xác nhận')) : s === 'Checked-in' ? t(L('In house', 'Đang ở')) : t(L('Cancelled', 'Đã hủy')) }))]}
        value={tab}
        onChange={setTab} />
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>
                {t(L('Booking ID', 'Mã đặt phòng'))}
              </th>
              <th>
                {t(L('Guest', 'Khách'))}
              </th>
              <th>
                {t(L('Room / Type', 'Phòng / Hạng'))}
              </th>
              <th>
                {t(L('Stay dates', 'Ngày lưu trú'))}
              </th>
              <th>
                {t(L('Amount', 'Thành tiền'))}
              </th>
              <th>
                {t(L('Booking', 'Trạng thái'))}
              </th>
              <th>
                {t(L('Payment', 'Thanh toán'))}
              </th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map(b => <tr key={b.id}>
              <td>
                <button className="mono-link" onClick={() => setSelected(b)}>
                  {b.id}
                </button>
                <small className="table-subtext">
                  {b.channel}
                </small>
              </td>
              <td>
                <strong>
                  {b.guest}
                </strong>
                <small className="table-subtext">
                  {b.email}
                </small>
              </td>
              <td>
                {b.roomType}
                <small className="table-subtext">
                  {b.room ? `#${b.room}` : '—'}
                </small>
              </td>
              <td>
                <span>
                  {formatDate(b.checkIn, language)}
                </span>
                <small className="table-subtext">
                  {formatDate(b.checkOut, language)}
                </small>
              </td>
              <td>
                <strong>
                  {formatMoney(b.total, language)}
                </strong>
              </td>
              <td>
                <Status value={b.status} />
              </td>
              <td>
                <Status value={b.payment} />
              </td>
              <td>
                <IconAction name="chevron" label={t(L('Open booking', 'Xem booking'))} onClick={() => setSelected(b)} />
              </td>
            </tr>)}
          </tbody>
        </table>
        {!filtered.length && <div className="empty">
          {t(L('No reservations match the current filters.', 'Không tìm thấy đặt phòng phù hợp.'))}
        </div>}
      </div>
    </Card>
    {selected && !draft && <Modal
      title={`${t(L('Reservation', 'Đặt phòng'))} ${selected.id}`}
      onClose={() => setSelected(null)}
      width="lg"
      footer={<>
        <Button variant="ghost" onClick={() => setSelected(null)}>
          {t(L('Close', 'Đóng'))}
        </Button>
        <Button variant="secondary" icon="edit" onClick={() => setDraft({ ...selected })}>
          {t(L('Edit details', 'Chỉnh sửa'))}
        </Button>
      </>}>
      <div className="reservation-details">
        <div className="reservation-summary">
          <div>
            <span>
              {t(L('Booking status', 'Trạng thái booking'))}
            </span>
            <Status value={selected.status} />
          </div>
          <div>
            <span>
              {t(L('Payment status', 'Thanh toán'))}
            </span>
            <Status value={selected.payment} />
          </div>
          <div>
            <span>
              {t(L('Total amount', 'Tổng tiền'))}
            </span>
            <strong>
              {formatMoney(selected.total, language)}
            </strong>
          </div>
        </div>
        <div className="form-grid two">
          <div className="detail-block">
            <span>
              {t(L('Guest', 'Khách'))}
            </span>
            <strong>
              {selected.guest}
            </strong>
            <small>
              {selected.email}
            </small>
          </div>
          <div className="detail-block">
            <span>
              {t(L('Room', 'Phòng'))}
            </span>
            <strong>
              {selected.roomType}
            </strong>
            <small>#{selected.room || '—'}</small>
          </div>
          <div className="detail-block">
            <span>
              {t(L('Check-in', 'Nhận phòng'))}
            </span>
            <strong>
              {formatDate(selected.checkIn, language)}
            </strong>
          </div>
          <div className="detail-block">
            <span>
              {t(L('Check-out', 'Trả phòng'))}
            </span>
            <strong>
              {formatDate(selected.checkOut, language)}
            </strong>
          </div>
        </div>
        <NativeSelect
          label={t(L('Update booking status', 'Đổi trạng thái đặt phòng'))}
          value={selected.status}
          onChange={e => changeStatus(e.target.value)}
          choices={statusOptions.map(s => ({ value: s, label: s }))} />
        
      </div>
    </Modal>}
    {draft && <Modal
      title={t(L('Reservation details', 'Thông tin đặt phòng'))}
      onClose={() => setDraft(null)}
      width="lg"
      footer={<>
        <Button variant="ghost" onClick={() => setDraft(null)}>
          {t(L('Cancel', 'Hủy'))}
        </Button>
        <Button onClick={() => document.getElementById('save-reservation')?.click()}>
          {t(L('Save reservation', 'Lưu booking'))}
        </Button>
      </>}>
      <form onSubmit={save} className="stack-fields">
        <div className="form-grid two">
          <TextInput label={t(L('Guest name', 'Tên khách'))} required value={draft.guest} onChange={e => setDraft({ ...draft, guest: e.target.value })} />
          <TextInput label="Email" type="email" required value={draft.email} onChange={e => setDraft({ ...draft, email: e.target.value })} />
          <NativeSelect
            label={t(L('Room category', 'Hạng phòng'))}
            value={draft.roomType}
            onChange={e => setDraft({ ...draft, roomType: e.target.value })}
            choices={roomTypes.map(r => ({ value: r.name, label: r.name }))} />
          <NativeSelect
            label={t(L('Physical room', 'Số phòng'))}
            value={draft.room}
            onChange={e => setDraft({ ...draft, room: e.target.value })}
            choices={[{ value: '', label: t(L('Unassigned', 'Chưa gán phòng')) }, ...rooms.filter(r => r.type === draft.roomType).map(r => ({ value: r.number, label: `#${r.number}` }))]} />
          <TextInput
            type="date"
            required
            label={t(L('Check-in', 'Nhận phòng'))}
            value={draft.checkIn}
            onChange={e => setDraft({ ...draft, checkIn: e.target.value })} />
          <TextInput
            type="date"
            required
            label={t(L('Check-out', 'Trả phòng'))}
            value={draft.checkOut}
            onChange={e => setDraft({ ...draft, checkOut: e.target.value })} />
          <NativeSelect
            label={t(L('Booking status', 'Trạng thái'))}
            value={draft.status}
            onChange={e => setDraft({ ...draft, status: e.target.value })}
            choices={statusOptions.map(s => ({ value: s, label: s }))} />
          <TextInput
            label={t(L('Total amount (VND)', 'Tổng tiền (VND)'))}
            type="number"
            min={0}
            value={draft.total}
            onChange={e => setDraft({ ...draft, total: Number(e.target.value) })} />
        </div>
        <TextArea rows={3} label={t(L('Internal notes', 'Ghi chú nội bộ'))} value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} />
        <button id="save-reservation" type="submit" hidden />
      </form>
    </Modal>}
    <Toast />
  </div>;
}
