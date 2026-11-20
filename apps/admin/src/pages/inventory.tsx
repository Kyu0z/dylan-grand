import { useMemo, useState } from 'react';
import { L, type Room } from '../lib/domain';
import { useLocale } from '../lib/locale';
import { useDemoStore } from '../lib/demo-store';
import { Button, Card, Icon, InfoBanner, Modal, NativeSelect, PageHeader, SearchBox, Status, useToast } from '../components/ui';

const isoAtOffset = (offset: number) => {
  const date = new Date('2026-11-21T12:00:00');
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
};

const occupancyStatus = (room: Room, offset: number, bookings: ReturnType<typeof useDemoStore>['bookings']) => {
  if (!room.sellable) return 'Maintenance';
  const date = isoAtOffset(offset);
  const booking = bookings.find((item) => item.room === room.number && item.status !== 'Cancelled' && item.status !== 'Expired' && item.checkIn <= date && date < item.checkOut);
  return booking
    ? booking.status === 'Checked-in' ? 'Occupied' : 'Reserved'
    : room.housekeeping === 'Dirty' ? 'Needs cleaning' : 'Available';
};

const statusLabel = (status: string, t: (value: ReturnType<typeof L>) => string) => {
  switch (status) {
    case 'Occupied': return t(L('Occupied', 'Đang có khách'));
    case 'Reserved': return t(L('Reserved', 'Đã đặt'));
    case 'Maintenance': return t(L('Maintenance', 'Bảo trì'));
    case 'Needs cleaning': return t(L('Dirty', 'Chưa dọn'));
    default: return t(L('Available', 'Còn trống'));
  }
};

const slotText = (status: string, t: (value: ReturnType<typeof L>) => string) => {
  switch (status) {
    case 'Occupied': return t(L('Occupied', 'Có khách'));
    case 'Reserved': return t(L('Reserved', 'Giữ chỗ'));
    case 'Maintenance': return t(L('Maintenance', 'Bảo trì'));
    case 'Needs cleaning': return t(L('Dirty', 'Cần dọn'));
    default: return t(L('Available', 'Available'));
  }
};

export function InventoryPage() {
  const { t, language } = useLocale();
  const { rooms, bookings, update } = useDemoStore();
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'week' | 'fortnight'>('week');
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<Room | null>(null);
  const [reason, setReason] = useState('Maintenance');
  const { notify, Toast } = useToast();

  const days = useMemo(() => Array.from({ length: view === 'week' ? 7 : 14 }, (_, index) => offset + index), [offset, view]);
  const filtered = rooms.filter((room) => (room.number + room.type).toLowerCase().includes(search.toLowerCase()));
  const inventoryCount = rooms.filter((room) => room.sellable).length;
  const monthLabel = new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-US', { month: 'long', year: 'numeric' }).format(new Date(`${isoAtOffset(offset)}T12:00:00`));

  return <div className="page-stack">
    <PageHeader
      eyebrow="AD-05 / INVENTORY"
      title={t(L('Inventory calendar', 'Lịch tồn phòng'))}
      description={t(L('See your sellable rooms, reservations and maintenance in one timeline.', 'Theo dõi phòng mở bán, booking và bảo trì trong cùng một lịch vận hành.'))}
      action={<Button icon="plus" onClick={() => setSelected(rooms[0] ?? null)}>{t(L('Block a room', 'Chặn bán phòng'))}</Button>} />

    <div className="metric-grid three">
      <div className="metric compact"><span>{t(L('Physical rooms', 'Phòng vật lý'))}</span><strong>{rooms.length}</strong></div>
      <div className="metric compact"><span>{t(L('Sellable inventory', 'Tồn phòng có thể bán'))}</span><strong>{inventoryCount}</strong></div>
      <div className="metric compact"><span>{t(L('Maintenance blocks', 'Đang chặn bảo trì'))}</span><strong>{rooms.length - inventoryCount}</strong></div>
    </div>

    <Card className="inventory-panel">
      <div className="inventory-toolbar">
        <SearchBox value={search} onChange={setSearch} placeholder={t(L('Find a room…', 'Tìm phòng…'))} />
        <div className="inventory-nav">
          <div className="segmented" role="tablist" aria-label={t(L('Timeline span', 'Khoảng thời gian'))}>
            <button type="button" onClick={() => setView('week')} className={view === 'week' ? 'selected' : ''}>{t(L('7 days', '7 ngày'))}</button>
            <button type="button" onClick={() => setView('fortnight')} className={view === 'fortnight' ? 'selected' : ''}>{t(L('14 days', '14 ngày'))}</button>
          </div>
          <div className="inventory-period-nav" aria-label={t(L('Timeline navigation', 'Điều hướng lịch'))}>
            <button type="button" className="mini-icon-btn" onClick={() => setOffset((current) => current - 7)} aria-label={t(L('Previous period', 'Kỳ trước'))}>
              <Icon name="left" size={14} />
            </button>
            <span className="timeline-period">{monthLabel}</span>
            <button type="button" className="mini-icon-btn" onClick={() => setOffset((current) => current + 7)} aria-label={t(L('Next period', 'Kỳ tiếp'))}>
              <Icon name="right" size={14} />
            </button>
          </div>
          <Button variant="secondary" onClick={() => setOffset(0)}>{t(L('Today', 'Hôm nay'))}</Button>
        </div>
      </div>

      <div className="timeline-scroller">
        <table className="inventory-table">
          <thead>
            <tr>
              <th className="inventory-room-head">{t(L('ROOM / TYPE', 'PHÒNG / HẠNG'))}</th>
              {days.map((day) => <th key={day}>
                <span>{new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-US', { weekday: 'short' }).format(new Date(`${isoAtOffset(day)}T12:00:00`))}</span>
                <strong>{Number(isoAtOffset(day).slice(-2))}</strong>
              </th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.map((room) => <tr key={room.number}>
              <th className="inventory-room-head">
                <strong>#{room.number}</strong>
                <small>{room.type}</small>
              </th>
              {days.map((day) => {
                const status = occupancyStatus(room, day, bookings);
                return <td key={`${room.number}-${day}`}>
                  <button
                    type="button"
                    className={`timeline-slot slot-${status.toLowerCase().replace(/\s/g, '-')}`}
                    title={`${room.number} · ${isoAtOffset(day)} · ${status}`}
                    onClick={() => setSelected(room)}>
                    {slotText(status, t)}
                  </button>
                </td>;
              })}
            </tr>)}
          </tbody>
        </table>
      </div>

      <div className="timeline-legend">
        {['Available', 'Reserved', 'Occupied', 'Maintenance', 'Needs cleaning'].map((status) => <span key={status}>
          <i className={`legend-chip slot-${status.toLowerCase().replace(/\s/g, '-')}`} />
          {statusLabel(status, t)}
        </span>)}
      </div>
    </Card>

    <InfoBanner>
      {t(L('Timeline is illustrative. Real inventory must be calculated nightly from reservations, active holds and maintenance blocks.', 'Lịch này là mô phỏng giao diện. Tồn phòng thực tế cần được tính theo từng đêm từ booking, giữ chỗ và lịch chặn bảo trì.'))}
    </InfoBanner>

    {selected && <Modal
      title={`${t(L('Room', 'Phòng'))} #${selected.number}`}
      onClose={() => setSelected(null)}
      footer={<>
        <Button variant="ghost" onClick={() => setSelected(null)}>{t(L('Close', 'Đóng'))}</Button>
        <Button onClick={() => {
          update('rooms', rooms.map((room) => room.number === selected.number
            ? { ...room, sellable: !room.sellable, occupancy: room.sellable ? 'Maintenance' : 'Vacant', notes: room.sellable ? reason : '' }
            : room));
          setSelected(null);
          notify(t(L('Room availability updated in the preview.', 'Đã cập nhật trạng thái phòng trong bản demo.')));
        }}>{selected.sellable ? t(L('Block sale', 'Chặn bán')) : t(L('Unblock room', 'Mở bán lại'))}</Button>
      </>}>
      <div className="stack-fields">
        <div className="summary-box">
          <div><span>{t(L('Category', 'Hạng phòng'))}</span><strong>{selected.type}</strong></div>
          <div><span>{t(L('Current status', 'Trạng thái hiện tại'))}</span><Status value={selected.occupancy} /></div>
        </div>
        <NativeSelect
          label={t(L('Block reason', 'Lý do chặn'))}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          choices={['Maintenance', 'Private use', 'Out of service'].map((value) => ({ value, label: value }))} />
        <InfoBanner>
          {t(L('For the preview, this action changes the room sellability, not a date-range maintenance record.', 'Ở bản demo, thao tác này thay đổi trạng thái được bán của phòng chứ chưa tạo lịch chặn theo khoảng ngày.'))}
        </InfoBanner>
      </div>
    </Modal>}
    <Toast />
  </div>;
}
