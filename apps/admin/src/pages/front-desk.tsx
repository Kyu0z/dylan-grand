import { useMemo, useState } from 'react';
import { L, formatDate, type Reservation } from '../lib/domain';
import { useLocale } from '../lib/locale';
import { useDemoStore } from '../lib/demo-store';
import { Button, Card, DateField, Icon, Modal, NativeSelect, PageHeader, Status, Tabs, useToast } from '../components/ui';

export function FrontDeskPage() {
  const { t, language } = useLocale();
  const { bookings, rooms, update } = useDemoStore();
  const [tab, setTab] = useState('arrivals');
  const [date, setDate] = useState('2026-11-21');
  const [selected, setSelected] = useState<Reservation | null>(null);
  const [assigned, setAssigned] = useState('');
  const { notify, Toast } = useToast();
  const arrivals = useMemo(() => bookings.filter(b => b.checkIn === date && ['Confirmed', 'Pending'].includes(b.status)), [bookings, date]);
  const departures = useMemo(() => bookings.filter(b => b.checkOut === date && ['Checked-in', 'Confirmed'].includes(b.status)), [bookings, date]);
  const inHouse = bookings.filter(b => b.status === 'Checked-in');
  const current = tab === 'arrivals' ? arrivals : tab === 'departures' ? departures : inHouse;
  const ready = (b: Reservation) => { const r = rooms.find(x => x.number === (assigned || b.room)); return !!r && r.sellable && ['Clean', 'Inspected'].includes(r.housekeeping); };
  const act = (b: Reservation, action: 'Checked-in' | 'Checked-out' | 'No-show') => {
    if (action === 'Checked-in' && !ready(b)) { notify(t(L('Select a clean, sellable room before check-in.', 'Cần chọn phòng được phép bán và đã dọn sạch trước khi nhận phòng.'))); return; }
    const room = assigned || b.room;
    update('bookings', bookings.map(x => x.id === b.id ? { ...x, status: action, room } : x));
    if (action === 'Checked-in') update('rooms', rooms.map(r => r.number === room ? { ...r, occupancy: 'Occupied' } : r));
    if (action === 'Checked-out') update('rooms', rooms.map(r => r.number === b.room ? { ...r, occupancy: 'Vacant', housekeeping: 'Dirty' } : r));
    setSelected(null); setAssigned(''); notify(t(L('This module is not available yet.', 'Chức năng này hiện chưa khả dụng.')));
  };
  return <div className="page-stack">
    <PageHeader
      
      title={t(L('Front desk', 'Lễ tân'))}
      description={t(L('A thoughtful arrival and departure experience, from one workspace.', 'Quản lý đón khách và trả phòng thuận tiện trong một màn hình.'))}
      action={<div className="date-chip">
        <DateField aria-label="Front desk date" value={date} onChange={e => setDate(e.target.value)} />
      </div>} />
    <div className="metric-grid three">
      <div className="metric compact">
        <span>
          {t(L('Expected arrivals', 'Dự kiến đến'))}
        </span>
        <strong>
          {arrivals.length}
        </strong>
      </div>
      <div className="metric compact">
        <span>
          {t(L('Expected departures', 'Dự kiến đi'))}
        </span>
        <strong>
          {departures.length}
        </strong>
      </div>
      <div className="metric compact">
        <span>
          {t(L('Currently in house', 'Đang lưu trú'))}
        </span>
        <strong>
          {inHouse.length}
        </strong>
      </div>
    </div>
    <Card>
      <Tabs
        items={[{ id: 'arrivals', label: t(L('Arrivals', 'Khách đến')) }, { id: 'departures', label: t(L('Departures', 'Khách đi')) }, { id: 'in-house', label: t(L('In-house guests', 'Đang lưu trú')) }]}
        value={tab}
        onChange={setTab} />
      <div className="frontdesk-list">
        {current.length ? current.map(b => <div className="frontdesk-row" key={b.id}>
          <div className="guest-avatar">
            {b.guest.split(' ').map(x => x[0]).slice(0, 2).join('')}
          </div>
          <div className="frontdesk-person">
            <strong>
              {b.guest}
            </strong>
            <span>{b.id} · {b.roomType}</span>
          </div>
          <div className="frontdesk-date">
            <small>
              {t(L('Stay', 'Lưu trú'))}
            </small>
            <strong>{formatDate(b.checkIn, language)} — {formatDate(b.checkOut, language)}</strong>
          </div>
          <Status value={b.status} />
          <Button variant="secondary" onClick={() => { setSelected(b); setAssigned(b.room); }}>
            {tab === 'arrivals' ? t(L('Check in', 'Nhận phòng')) : tab === 'departures' ? t(L('Check out', 'Trả phòng')) : t(L('View stay', 'Xem lưu trú'))}
          </Button>
        </div>) : <div className="calm-empty">
          <Icon name="calendar" size={26} />
          <p>
            {t(L('No guests scheduled in this view.', 'Không có khách trong danh sách này.'))}
          </p>
        </div>}
      </div>
    </Card>
    
    {selected && <Modal
      title={t(L('Guest stay details', 'Chi tiết lưu trú'))}
      onClose={() => setSelected(null)}
      footer={<>
        <Button variant="ghost" onClick={() => setSelected(null)}>
          {t(L('Close', 'Đóng'))}
        </Button>
        {selected.status === 'Confirmed' && <Button onClick={() => act(selected, 'Checked-in')}>
          {t(L('Complete check-in', 'Hoàn tất nhận phòng'))}
        </Button>}
        {selected.status === 'Checked-in' && <Button onClick={() => act(selected, 'Checked-out')}>
          {t(L('Complete check-out', 'Hoàn tất trả phòng'))}
        </Button>}
      </>}>
      <div className="stack-fields">
        <div className="summary-box">
          <div>
            <span>
              {t(L('Guest', 'Khách'))}
            </span>
            <strong>
              {selected.guest}
            </strong>
          </div>
          <div>
            <span>
              {t(L('Room type', 'Hạng phòng'))}
            </span>
            <strong>
              {selected.roomType}
            </strong>
          </div>
          <div>
            <span>
              {t(L('Payment', 'Thanh toán'))}
            </span>
            <Status value={selected.payment} />
          </div>
        </div>
        <NativeSelect
          label={t(L('Assign physical room', 'Gán phòng vật lý'))}
          value={assigned}
          onChange={e => setAssigned(e.target.value)}
          choices={[{ value: '', label: t(L('Select room', 'Chọn phòng')) }, ...rooms.filter(r => r.type === selected.roomType).map(r => ({ value: r.number, label: `#${r.number} · ${r.housekeeping} · ${r.occupancy}` }))]} />
        {assigned && <div className="readiness-check">
          <Icon name={ready(selected) ? 'check' : 'info'} size={17} />
          <span>
            {ready(selected) ? t(L('Room is ready for guest arrival.', 'Phòng sẵn sàng đón khách.')) : t(L('Room requires attention before check-in.', 'Phòng cần được xử lý trước khi nhận khách.'))}
          </span>
        </div>}
        {selected.status === 'Confirmed' && <Button variant="ghost" onClick={() => act(selected, 'No-show')}>
          {t(L('Mark no-show', 'Đánh dấu vắng mặt'))}
        </Button>}
      </div>
    </Modal>}
    <Toast />
  </div>;
}
