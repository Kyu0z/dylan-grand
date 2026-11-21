import { useMemo } from 'react';
import { L, formatMoney, type Reservation } from '../lib/domain';
import { useLocale } from '../lib/locale';
import { useDemoStore } from '../lib/demo-store';
import { Badge, Button, Card, Icon, Metric, MiniBarChart, Money, PageHeader, ProgressBar, Status } from '../components/ui';

const trends = [42, 55, 49, 67, 63, 73, 68, 82, 76, 91, 86, 98];
export function Overview({ go }: { go: (path: string) => void; }) {
  const { t, language } = useLocale();
  const { bookings, rooms } = useDemoStore();
  const arrivals = bookings.filter(b => b.checkIn === '2026-11-21' && b.status !== 'Cancelled');
  const departures = bookings.filter(b => b.checkOut === '2026-11-21' && b.status !== 'Cancelled');
  const pending = bookings.filter(b => b.status === 'Pending');
  const occupied = rooms.filter(r => r.occupancy === 'Occupied').length;
  const sellable = rooms.filter(r => r.sellable).length;
  const revenue = useMemo(() => bookings.filter(b => b.payment === 'Paid').reduce((sum, b) => sum + b.total, 0), [bookings]);
  return <div className="page-stack">
    <PageHeader
      eyebrow="AD-01 / OVERVIEW"
      title={t(L('A clear view of your hotel.', 'Toàn cảnh hoạt động khách sạn.'))}
      description={t(L('Your operations at a glance — bookings, rooms and revenue in one place.', 'Tổng quan đặt phòng, tình trạng phòng và doanh thu tại một nơi.'))}
      action={<>
        <span className="date-chip">
          <Icon name="calendar" size={15} />
          {t(L('21 November 2026', '21 tháng 11, 2026'))}
        </span>
        <Button onClick={() => go('/reservations')} icon="plus">
          {t(L('New reservation', 'Tạo đặt phòng'))}
        </Button>
      </>} />
    <div className="metric-grid four">
      <Metric
        label={t(L('Total rooms', 'Tổng phòng'))}
        value={rooms.length.toString().padStart(2, '0')}
        delta={t(L('Across 3 room categories', 'Thuộc 3 hạng phòng'))}
        icon="bed" />
      <Metric
        label={t(L('Occupied rooms', 'Phòng có khách'))}
        value={occupied.toString().padStart(2, '0')}
        delta={`${Math.round(occupied / rooms.length * 100)}% ${t(L('occupancy', 'lấp đầy'))}`}
        icon="door" />
      <Metric
        label={t(L('Available to sell', 'Phòng có thể bán'))}
        value={(sellable - occupied - rooms.filter(r => r.occupancy === 'Reserved').length).toString().padStart(2, '0')}
        delta={t(L('Excludes reservations & maintenance', 'Đã loại đặt trước & bảo trì'))}
        icon="check" />
      <Metric
        label={t(L('Pending reservations', 'Đặt phòng chờ xử lý'))}
        value={pending.length.toString().padStart(2, '0')}
        delta={t(L('Requires attention', 'Cần xử lý'))}
        icon="clock" />
    </div>
    <div className="overview-main-grid">
      <Card
        title={t(L('Revenue overview', 'Tổng quan doanh thu'))}
        subtitle={t(L('Illustrative monthly trend', 'Xu hướng theo tháng — dữ liệu mẫu'))}
        action={<Badge tone="gold">2026</Badge>}>
        <div className="revenue-header">
          <div>
            <span>
              {t(L('Confirmed paid revenue', 'Doanh thu đã thanh toán'))}
            </span>
            <strong>
              {formatMoney(revenue, language)}
            </strong>
          </div>
          <Badge tone="success">+12.8%</Badge>
        </div>
        <MiniBarChart values={trends} labels={['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']} />
      </Card>
      <Card title={t(L('Room occupancy', 'Tỷ lệ lấp đầy'))} subtitle={t(L('Current sample property status', 'Tình trạng phòng mẫu hiện tại'))}>
        <div className="occupancy-big">
          <strong>{Math.round(occupied / rooms.length * 100)}%</strong>
          <span>
            {t(L('Currently occupied', 'Đang có khách'))}
          </span>
        </div>
        <ProgressBar value={occupied} max={rooms.length} />
        <div className="occupancy-legend">
          <span>
            <i className="legend-dot green" />
            {t(L('Occupied', 'Có khách'))}
            <strong>
              {occupied}
            </strong>
          </span>
          <span>
            <i className="legend-dot sand" />
            {t(L('Other statuses', 'Trạng thái khác'))}
            <strong>
              {rooms.length - occupied}
            </strong>
          </span>
        </div>
        <div className="subtle-note">
          {t(L('Occupancy is separate from housekeeping readiness.', 'Trạng thái lưu trú và dọn phòng được quản lý độc lập.'))}
        </div>
      </Card>
    </div>
    <div className="overview-bottom-grid">
      <Card
        title={t(L('Today’s arrivals', 'Khách đến hôm nay'))}
        subtitle={t(L('Scheduled check-ins', 'Danh sách dự kiến nhận phòng'))}
        action={<button className="inline-link" onClick={() => go('/front-desk')}>
          {t(L('Front desk', 'Lễ tân'))}
          <Icon name="arrow" size={15} />
        </button>}>
        <GuestMiniList bookings={arrivals} empty={t(L('No scheduled arrivals for this date.', 'Không có khách đến dự kiến ngày này.'))} />
      </Card>
      <Card
        title={t(L('Today’s departures', 'Khách rời hôm nay'))}
        subtitle={t(L('Scheduled check-outs', 'Danh sách dự kiến trả phòng'))}
        action={<button className="inline-link" onClick={() => go('/front-desk')}>
          {t(L('View all', 'Xem tất cả'))}
          <Icon name="arrow" size={15} />
        </button>}>
        <GuestMiniList bookings={departures} empty={t(L('No scheduled departures for this date.', 'Không có khách rời dự kiến ngày này.'))} />
      </Card>
      <Card title={t(L('Needs attention', 'Việc cần chú ý'))} subtitle={t(L('Operational priorities', 'Ưu tiên vận hành'))}>
        <div className="attention-list">
          <button onClick={() => go('/reservations')}>
            <span className="attention-icon">
              <Icon name="clipboard" />
            </span>
            <span>
              {t(L('Pending bookings', 'Đặt phòng chờ xác nhận'))}
            </span>
            <strong>
              {pending.length}
            </strong>
            <Icon name="chevron" size={15} />
          </button>
          <button onClick={() => go('/housekeeping')}>
            <span className="attention-icon">
              <Icon name="sparkles" />
            </span>
            <span>
              {t(L('Rooms requiring cleaning', 'Phòng cần dọn'))}
            </span>
            <strong>
              {rooms.filter(r => r.housekeeping === 'Dirty').length}
            </strong>
            <Icon name="chevron" size={15} />
          </button>
          <button onClick={() => go('/physical-rooms')}>
            <span className="attention-icon">
              <Icon name="door" />
            </span>
            <span>
              {t(L('Rooms under maintenance', 'Phòng đang bảo trì'))}
            </span>
            <strong>
              {rooms.filter(r => !r.sellable).length}
            </strong>
            <Icon name="chevron" size={15} />
          </button>
        </div>
      </Card>
    </div>
    <Card
      title={t(L('Recent reservations', 'Đặt phòng gần đây'))}
      subtitle={t(L('Latest guest activity across channels', 'Hoạt động mới nhất từ các kênh'))}
      action={<button className="inline-link" onClick={() => go('/reservations')}>
        {t(L('All reservations', 'Tất cả đặt phòng'))}
        <Icon name="arrow" size={15} />
      </button>}>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>
                {t(L('Booking', 'Mã đặt'))}
              </th>
              <th>
                {t(L('Guest', 'Khách'))}
              </th>
              <th>
                {t(L('Room', 'Phòng'))}
              </th>
              <th>
                {t(L('Check-in', 'Nhận phòng'))}
              </th>
              <th>
                {t(L('Status', 'Trạng thái'))}
              </th>
              <th className="align-right">
                {t(L('Total', 'Tổng tiền'))}
              </th>
            </tr>
          </thead>
          <tbody>
            {bookings.slice(0, 5).map(b => <tr key={b.id}>
              <td>
                <strong className="mono-link">
                  {b.id}
                </strong>
              </td>
              <td>
                {b.guest}
              </td>
              <td>
                {b.roomType}
              </td>
              <td>
                {b.checkIn}
              </td>
              <td>
                <Status value={b.status} />
              </td>
              <td className="align-right">
                <Money value={b.total} />
              </td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </Card>
  </div>;
}
function GuestMiniList({ bookings, empty }: { bookings: Reservation[]; empty: string; }) {
  return bookings.length ? <div className="guest-mini-list">
    {bookings.map(b => <div key={b.id}>
      <div className="guest-avatar">
        {b.guest.split(' ').map(s => s[0]).slice(0, 2).join('')}
      </div>
      <div>
        <strong>
          {b.guest}
        </strong>
        <span>{b.roomType} · #{b.room}</span>
      </div>
      <Status value={b.status} />
    </div>)}
  </div> : <div className="calm-empty">
    <Icon name="calendar" />
    <p>
      {empty}
    </p>
  </div>;
}
