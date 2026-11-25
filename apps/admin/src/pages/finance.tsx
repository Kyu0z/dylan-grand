import { useState } from 'react';
import { L, formatDate, formatMoney, type Payment } from '../lib/domain';
import { useLocale } from '../lib/locale';
import { useDemoStore } from '../lib/demo-store';
import { Button, Card, Metric, MiniBarChart, Modal, NativeSelect, PageHeader, SearchBox, Status, Tabs, TextInput, useToast } from '../components/ui';

export function PaymentsPage() {
  const { t, language } = useLocale();
  const { payments, bookings, update } = useDemoStore();
  const [tab, setTab] = useState('All');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<'payment' | 'refund' | null>(null);
  const [draft, setDraft] = useState({ booking: bookings[0]?.id ?? '', amount: '', method: 'Cash', note: '' });
  const { notify, Toast } = useToast();
  const filtered = payments.filter(p => (p.id + p.booking + p.guest).toLowerCase().includes(search.toLowerCase()) && (tab === 'All' || p.status === tab));
  const received = payments.filter(p => p.status === 'Paid').reduce((s, p) => s + p.amount, 0);
  const refunds = payments.filter(p => p.kind === 'Refund').reduce((s, p) => s + Math.abs(p.amount), 0);
  const save = () => {
    const value = Number(draft.amount);
    if (!draft.booking || !Number.isFinite(value) || value <= 0) { notify(t(L('Select a booking and enter a positive amount.', 'Chọn booking và nhập số tiền lớn hơn 0.'))); return; }
    const booking = bookings.find(b => b.id === draft.booking);
    const payment: Payment = { id: `PAY-${Date.now().toString().slice(-6)}`, booking: draft.booking, guest: booking?.guest ?? 'Guest', amount: modal === 'refund' ? -value : value, method: draft.method, date: new Date().toISOString().slice(0, 10), status: modal === 'refund' ? 'Refunded' : 'Paid', kind: modal === 'refund' ? 'Refund' : 'Charge' };
    update('payments', [payment, ...payments]); setModal(null); setDraft({ booking: bookings[0]?.id ?? '', amount: '', method: 'Cash', note: '' }); notify(t(L('This module is not available yet.', 'Chức năng này hiện chưa khả dụng.')));
  };
  return <div className="page-stack">
    <PageHeader
      
      title={t(L('Payments & refunds', 'Thanh toán & hoàn tiền'))}
      description={t(L('Monitor every transaction and outstanding guest balance.', 'Theo dõi giao dịch và các khoản thanh toán của khách.'))}
      action={<>
        <Button variant="secondary" onClick={() => setModal('refund')}>
          {t(L('New refund', 'Tạo hoàn tiền'))}
        </Button>
        <Button icon="plus" onClick={() => setModal('payment')}>
          {t(L('Record payment', 'Ghi nhận thanh toán'))}
        </Button>
      </>} />
    <div className="metric-grid four">
      <Metric label={t(L('Payments received', 'Đã thu'))} value={formatMoney(received, language)} icon="wallet" />
      <Metric label={t(L('Refunds issued', 'Đã hoàn'))} value={formatMoney(refunds, language)} icon="refresh" />
      <Metric label={t(L('Failed transactions', 'Giao dịch lỗi'))} value={payments.filter(p => p.status === 'Failed').length} icon="info" />
      <Metric label={t(L('Recorded transactions', 'Tổng giao dịch'))} value={payments.length} icon="clipboard" />
    </div>
    <Card
      title={t(L('Transaction ledger', 'Sổ giao dịch'))}
      subtitle={t(L('Payment statuses are separate from booking statuses.', 'Trạng thái thanh toán độc lập với trạng thái booking.'))}>
      <div className="table-toolbar">
        <SearchBox value={search} onChange={setSearch} placeholder={t(L('Search payment, guest or booking…', 'Tìm giao dịch, khách hoặc booking…'))} />
      </div>
      <Tabs
        items={['All', 'Paid', 'Failed', 'Refunded'].map(s => ({ id: s, label: s === 'All' ? t(L('All transactions', 'Tất cả')) : s === 'Paid' ? t(L('Paid', 'Đã trả')) : s === 'Failed' ? t(L('Failed', 'Thất bại')) : t(L('Refunded', 'Đã hoàn')) }))}
        value={tab}
        onChange={setTab} />
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>
                {t(L('Reference', 'Mã giao dịch'))}
              </th>
              <th>
                {t(L('Booking & guest', 'Booking & khách'))}
              </th>
              <th>
                {t(L('Date', 'Ngày'))}
              </th>
              <th>
                {t(L('Method', 'Phương thức'))}
              </th>
              <th>
                {t(L('Type', 'Loại'))}
              </th>
              <th>
                {t(L('Status', 'Trạng thái'))}
              </th>
              <th className="align-right">
                {t(L('Amount', 'Số tiền'))}
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => <tr key={p.id}>
              <td>
                <strong className="mono-link">
                  {p.id}
                </strong>
              </td>
              <td>
                {p.guest}
                <small className="table-subtext">
                  {p.booking}
                </small>
              </td>
              <td>
                {formatDate(p.date, language)}
              </td>
              <td>
                {p.method}
              </td>
              <td>
                {p.kind}
              </td>
              <td>
                <Status value={p.status} />
              </td>
              <td className="align-right">
                <strong className={p.amount < 0 ? 'amount-negative' : ''}>
                  {formatMoney(p.amount, language)}
                </strong>
              </td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </Card>
    
    {modal && <Modal
      title={modal === 'payment' ? t(L('Record a payment', 'Ghi nhận thanh toán')) : t(L('Record a refund', 'Ghi nhận hoàn tiền'))}
      onClose={() => setModal(null)}
      footer={<>
        <Button variant="ghost" onClick={() => setModal(null)}>
          {t(L('Cancel', 'Hủy'))}
        </Button>
        <Button onClick={save}>
          {t(L('Save transaction', 'Lưu giao dịch'))}
        </Button>
      </>}>
      <div className="stack-fields">
        <NativeSelect
          label={t(L('Related booking', 'Booking liên quan'))}
          value={draft.booking}
          onChange={e => setDraft({ ...draft, booking: e.target.value })}
          choices={bookings.map(b => ({ value: b.id, label: `${b.id} — ${b.guest}` }))} />
        <TextInput
          type="number"
          min="1"
          required
          label={t(L('Amount (VND)', 'Số tiền (VND)'))}
          value={draft.amount}
          onChange={e => setDraft({ ...draft, amount: e.target.value })} />
        <NativeSelect
          label={t(L('Payment method', 'Phương thức thanh toán'))}
          value={draft.method}
          onChange={e => setDraft({ ...draft, method: e.target.value })}
          choices={['Cash', 'Card', 'Transfer'].map(x => ({ value: x, label: x }))} />
        
      </div>
    </Modal>}
    <Toast />
  </div>;
}

const bookingTrend = [13, 17, 11, 22, 20, 25, 23, 28, 31, 29, 35, 38];
const revenueTrend = [12, 18, 14, 19, 24, 20, 30, 26, 34, 32, 41, 46];
export function ReportsPage() {
  const { t, language } = useLocale();
  const { bookings, roomTypes, rooms, payments } = useDemoStore();
  const [period, setPeriod] = useState('year');
  const [metric, setMetric] = useState('revenue');
  const confirmed = bookings.filter(b => ['Confirmed', 'Checked-in', 'Checked-out'].includes(b.status));
  const paid = payments.filter(p => p.status === 'Paid').reduce((total, p) => total + p.amount, 0);
  const occupied = rooms.filter(r => r.occupancy === 'Occupied').length;
  const stayNights = confirmed.reduce((s, b) => s + Math.max(1, Math.round((new Date(`${b.checkOut}T00:00:00`).getTime() - new Date(`${b.checkIn}T00:00:00`).getTime()) / 86400000)), 0);
  const roomRevenue = confirmed.reduce((s, b) => s + b.total, 0);
  const adr = stayNights ? roomRevenue / stayNights : 0;
  const revpar = roomRevenue / (rooms.length * 30);
  const summary = [{ label: L('Total bookings', 'Tổng đặt phòng'), value: bookings.length.toString(), hint: L('Across all statuses', 'Tất cả trạng thái') }, { label: L('Revenue collected', 'Doanh thu đã thu'), value: formatMoney(paid, language), hint: L('Paid transactions', 'Giao dịch đã thu') }, { label: L('Current occupancy', 'Lấp đầy hiện tại'), value: `${Math.round(occupied / rooms.length * 100)}%`, hint: L('Illustrative snapshot', 'Thống kê mẫu') }, { label: L('Cancellations / no-shows', 'Hủy / không đến'), value: String(bookings.filter(b => ['Cancelled', 'No-show'].includes(b.status)).length), hint: L('Sample reservation history', 'Lịch sử đặt phòng mẫu') }];
  const exportCSV = () => { const rows = [['Room Type', 'Confirmed Bookings', 'Revenue'], ...roomTypes.map(r => [r.name, confirmed.filter(b => b.roomType === r.name).length, String(confirmed.filter(b => b.roomType === r.name).reduce((s, b) => s + b.total, 0))])]; const body = rows.map(r => r.map(v => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\n'); const url = URL.createObjectURL(new Blob(['\ufeff', body], { type: 'text/csv;charset=utf-8' })); const a = document.createElement('a'); a.href = url; a.download = 'dylan-grand-report.csv'; a.click(); URL.revokeObjectURL(url); };
  return <div className="page-stack">
    <PageHeader
      
      title={t(L('Reports & insights', 'Báo cáo & phân tích'))}
      description={t(L('Understand your hotel’s performance through a considered lens.', 'Theo dõi hiệu quả vận hành và doanh thu một cách trực quan.'))}
      action={<>
        <NativeSelect
          value={period}
          onChange={e => setPeriod(e.target.value)}
          choices={[{ value: 'month', label: t(L('This month', 'Tháng này')) }, { value: 'year', label: t(L('This year', 'Năm nay')) }]} />
        <Button variant="secondary" icon="download" onClick={exportCSV}>
          {t(L('Export report', 'Xuất báo cáo'))}
        </Button>
      </>} />
    <div className="metric-grid four">
      {summary.map((x, i) => <Metric key={i} label={t(x.label)} value={x.value} delta={t(x.hint)} icon={['clipboard', 'wallet', 'hotel', 'info'][i]} />)}
    </div>
    <div className="overview-main-grid">
      <Card
        title={t(L('Performance trend', 'Xu hướng hoạt động'))}
        
        action={<NativeSelect
          value={metric}
          onChange={e => setMetric(e.target.value)}
          choices={[{ value: 'revenue', label: t(L('Revenue', 'Doanh thu')) }, { value: 'bookings', label: t(L('Bookings', 'Đặt phòng')) }]} />}>
        <div className="chart-headline">
          <span>
            {t(metric === 'revenue' ? L('Revenue trend', 'Xu hướng doanh thu') : L('Reservation trend', 'Xu hướng đặt phòng'))}
          </span>
          <strong>
            {metric === 'revenue' ? formatMoney(paid, language) : bookings.length.toString()}
          </strong>
        </div>
        <MiniBarChart
          values={metric === 'revenue' ? revenueTrend : bookingTrend}
          labels={['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']} />
      </Card>
      <Card
        title={t(L('Revenue by room category', 'Doanh thu theo hạng phòng'))}
        >
        <div className="room-revenue-list">
          {roomTypes.map(r => {
            const value = confirmed.filter(b => b.roomType === r.name).reduce((s, b) => s + b.total, 0); return <div key={r.id}>
              <div>
                <strong>
                  {r.name}
                </strong>
                <span>
                  {formatMoney(value, language)}
                </span>
              </div>
              <div className="progress-track">
                <span style={{ width: `${Math.max(0, value / Math.max(1, roomRevenue) * 100)}%` }} />
              </div>
            </div>;
          })}
        </div>
      </Card>
    </div>
    <div className="metric-grid three">
      <div className="metric compact">
        <span>ADR — {t(L('Average Daily Rate', 'Giá phòng bình quân'))}</span>
        <strong>
          {formatMoney(adr, language)}
        </strong>
      </div>
      <div className="metric compact">
        <span>RevPAR — {t(L('Revenue / Available Room', 'Doanh thu / phòng khả dụng'))}</span>
        <strong>
          {formatMoney(revpar, language)}
        </strong>
      </div>
      <div className="metric compact">
        <span>
          {t(L('Confirmed room nights', 'Đêm phòng đã xác nhận'))}
        </span>
        <strong>
          {stayNights}
        </strong>
      </div>
    </div>
    
  </div>;
}
