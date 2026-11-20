import { useMemo, useState } from 'react';
import { L, type Room } from '../lib/domain';
import { useLocale } from '../lib/locale';
import { useDemoStore } from '../lib/demo-store';
import { Button, Card, InfoBanner, Modal, NativeSelect, PageHeader, SearchBox, Status, useToast } from '../components/ui';

const isoAtOffset = (offset: number) => { const d = new Date('2026-11-21T12:00:00'); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10); };
const occupancyStatus = (room: Room, offset: number, bookings: ReturnType<typeof useDemoStore>['bookings']) => {
  if (!room.sellable) return 'Maintenance';
  const date = isoAtOffset(offset);
  const booking = bookings.find(b => b.room === room.number && b.status !== 'Cancelled' && b.status !== 'Expired' && b.checkIn <= date && date < b.checkOut);
  return booking ? booking.status === 'Checked-in' ? 'Occupied' : 'Reserved' : room.housekeeping === 'Dirty' ? 'Needs cleaning' : 'Available';
};
export function InventoryPage() {
  const { t, language } = useLocale();
  const { rooms, bookings, update } = useDemoStore();
  const [search, setSearch] = useState('');
  const [view, setView] = useState('week');
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<Room | null>(null);
  const [reason, setReason] = useState('Maintenance');
  const { notify, Toast } = useToast();
  const days = useMemo(() => Array.from({ length: view === 'week' ? 7 : 14 }, (_, i) => offset + i), [offset, view]);
  const filtered = rooms.filter(r => (r.number + r.type).toLowerCase().includes(search.toLowerCase()));
  const inventoryCount = rooms.filter(r => r.sellable).length;
  return <div className="page-stack">
    <PageHeader
      eyebrow="AD-05 / INVENTORY"
      title={t(L('Inventory calendar', 'Lịch tồn phòng'))}
      description={t(L('See your sellable rooms, reservations and maintenance in one timeline.', 'Theo dõi phòng mở bán, đặt trước và bảo trì trên cùng một lịch.'))}
      action={<Button icon="plus" onClick={() => setSelected(rooms[0] ?? null)}>
        {t(L('Block a room', 'Chặn bán phòng'))}
      </Button>} />
    <div className="metric-grid three">
      <div className="metric compact">
        <span>
          {t(L('Physical rooms', 'Phòng vật lý'))}
        </span>
        <strong>
          {rooms.length}
        </strong>
      </div>
      <div className="metric compact">
        <span>
          {t(L('Sellable inventory', 'Tồn phòng có thể bán'))}
        </span>
        <strong>
          {inventoryCount}
        </strong>
      </div>
      <div className="metric compact">
        <span>
          {t(L('Maintenance blocks', 'Đang chặn bảo trì'))}
        </span>
        <strong>
          {rooms.length - inventoryCount}
        </strong>
      </div>
    </div>
    <Card className="inventory-panel">
      <div className="inventory-toolbar">
        <SearchBox value={search} onChange={setSearch} placeholder={t(L('Find a room…', 'Tìm số phòng…'))} />
        <div className="inventory-nav">
          <div className="segmented">
            <button onClick={() => setView('week')} className={view === 'week' ? 'selected' : ''}>
              {t(L('7 days', '7 ngày'))}
            </button>
            <button onClick={() => setView('fortnight')} className={view === 'fortnight' ? 'selected' : ''}>
              {t(L('14 days', '14 ngày'))}
            </button>
          </div>
          <Button variant="secondary" onClick={() => setOffset(x => x - 7)}>‹</Button>
          <span className="timeline-period">
            {new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-US', { month: 'short', year: 'numeric' }).format(new Date(`${isoAtOffset(offset)}T12:00:00`))}
          </span>
          <Button variant="secondary" onClick={() => setOffset(x => x + 7)}>›</Button>
          <Button variant="ghost" onClick={() => setOffset(0)}>
            {t(L('Today', 'Hôm nay'))}
          </Button>
        </div>
      </div>
      <div className="timeline-scroller">
        <table className="inventory-table">
          <thead>
            <tr>
              <th className="inventory-room-head">
                {t(L('ROOM / TYPE', 'PHÒNG / HẠNG'))}
              </th>
              {days.map(day => <th key={day}>
                <span>
                  {new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-US', { weekday: 'short' }).format(new Date(`${isoAtOffset(day)}T12:00:00`))}
                </span>
                <strong>
                  {Number(isoAtOffset(day).slice(-2))}
                </strong>
              </th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.map(room => <tr key={room.number}>
              <th className="inventory-room-head">
                <strong>#{room.number}</strong>
                <small>
                  {room.type}
                </small>
              </th>
              {days.map(day => {
                const status = occupancyStatus(room, day, bookings); return <td key={day}>
                  <button
                    className={`timeline-slot slot-${status.toLowerCase().replace(/\s/g, '-')}`}
                    title={`${room.number} · ${isoAtOffset(day)} · ${status}`}
                    onClick={() => setSelected(room)}>
                    {status === 'Available' ? '·' : status === 'Occupied' ? t(L('In house', 'Có khách')) : status === 'Reserved' ? t(L('Booked', 'Đã đặt')) : status === 'Maintenance' ? t(L('Blocked', 'Chặn')) : t(L('Dirty', 'Chưa dọn'))}
                  </button>
                </td>;
              })}
            </tr>)}
          </tbody>
        </table>
      </div>
      <div className="timeline-legend">
        {[['Available', t(L('Available', 'Còn trống'))], ['Reserved', t(L('Reserved', 'Đã đặt'))], ['Occupied', t(L('Occupied', 'Có khách'))], ['Maintenance', t(L('Maintenance', 'Bảo trì'))], ['Needs cleaning', t(L('Dirty', 'Chưa dọn'))]].map(([x, label]) => <span key={x}>
          <i className={`legend-chip slot-${x.toLowerCase().replace(/\s/g, '-')}`} />
          {label}
        </span>)}
      </div>
    </Card>
    <InfoBanner>
      {t(L('Timeline is illustrative. Real inventory must be calculated nightly from reservations, active holds and maintenance blocks.', 'Lịch chỉ mang tính minh họa. Tồn phòng thật cần tính theo từng đêm từ booking, giữ chỗ còn hạn và lịch bảo trì.'))}
    </InfoBanner>
    {selected && <Modal
      title={`${t(L('Room', 'Phòng'))} #${selected.number}`}
      onClose={() => setSelected(null)}
      footer={<>
        <Button variant="ghost" onClick={() => setSelected(null)}>
          {t(L('Close', 'Đóng'))}
        </Button>
        <Button onClick={() => { update('rooms', rooms.map(r => r.number === selected.number ? { ...r, sellable: !r.sellable, occupancy: r.sellable ? 'Maintenance' : 'Vacant', notes: r.sellable ? reason : '' } : r)); setSelected(null); notify(t(L('Room availability updated in the preview.', 'Đã cập nhật trạng thái phòng trong bản demo.'))); }}>
          {selected.sellable ? t(L('Block sale', 'Chặn bán')) : t(L('Unblock room', 'Mở bán lại'))}
        </Button>
      </>}>
      <div className="stack-fields">
        <div className="summary-box">
          <div>
            <span>
              {t(L('Category', 'Hạng phòng'))}
            </span>
            <strong>
              {selected.type}
            </strong>
          </div>
          <div>
            <span>
              {t(L('Current status', 'Trạng thái hiện tại'))}
            </span>
            <Status value={selected.occupancy} />
          </div>
        </div>
        <NativeSelect
          label={t(L('Block reason', 'Lý do chặn'))}
          value={reason}
          onChange={e => setReason(e.target.value)}
          choices={['Maintenance', 'Private use', 'Out of service'].map(v => ({ value: v, label: v }))} />
        <InfoBanner>
          {t(L('For the preview, this action changes the room sellability, not a date-range maintenance record.', 'Bản demo chỉ thay đổi trạng thái được bán của phòng, chưa tạo lịch chặn theo khoảng ngày.'))}
        </InfoBanner>
      </div>
    </Modal>}
    <Toast />
  </div>;
}
