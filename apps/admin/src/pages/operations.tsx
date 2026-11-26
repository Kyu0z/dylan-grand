import { MoneyInput } from '../components/money-input';
import { useState } from 'react';
import { L, formatMoney, type Guest, type Promotion, type Service } from '../lib/domain';
import { useLocale } from '../lib/locale';
import { useDemoStore } from '../lib/demo-store';
import { Badge, Button, Card, Icon, IconAction, InfoBanner, Metric, Modal, NativeSelect, PageHeader, SearchBox, Status, Tabs, TextArea, TextInput, useToast } from '../components/ui';

const colorFor = (status: string) => status === 'Dirty' ? 'warning' : status === 'Inspected' ? 'info' : 'success';
export function HousekeepingPage() {
  const { t } = useLocale();
  const { rooms, update } = useDemoStore();
  const [filter, setFilter] = useState('All');
  const [selected, setSelected] = useState<string | null>(null);
  const [assignees, setAssignees] = useState<Record<string, string>>({});
  const [note, setNote] = useState('');
  const { notify, Toast } = useToast();
  const pending = rooms.filter(r => r.housekeeping === 'Dirty').length;
  const cleaned = rooms.filter(r => r.housekeeping === 'Clean').length;
  const inspected = rooms.filter(r => r.housekeeping === 'Inspected').length;
  const shown = rooms.filter(r => filter === 'All' || r.housekeeping === filter);
  const change = (roomNumber: string, status: string) => {
    update('rooms', rooms.map(r => r.number === roomNumber ? { ...r, housekeeping: status, notes: note || r.notes } : r));
    setSelected(null); setNote(''); notify(t(L('This module is not available yet.', 'Chức năng này hiện chưa khả dụng.')));
  };
  return <div className="page-stack">
    <PageHeader

      title={t(L('Housekeeping board', 'Bảng công việc buồng phòng'))}
      description={t(L('A room is ready only when service and front desk are aligned.', 'Phòng chỉ sẵn sàng khi tình trạng vệ sinh và vận hành phù hợp.'))} />
    <div className="metric-grid three">
      <Metric label={t(L('Need cleaning', 'Cần dọn'))} value={pending} icon="sparkles" />
      <Metric label={t(L('Clean', 'Đã dọn'))} value={cleaned} icon="check" />
      <Metric label={t(L('Inspected', 'Đã kiểm tra'))} value={inspected} icon="shield" />
    </div>
    <div className="toolbar">
      <Tabs
        items={[{ id: 'All', label: t(L('All rooms', 'Tất cả')) }, { id: 'Dirty', label: t(L('Dirty', 'Cần dọn')) }, { id: 'Clean', label: t(L('Clean', 'Đã dọn')) }, { id: 'Inspected', label: t(L('Inspected', 'Đã kiểm tra')) }]}
        value={filter}
        onChange={setFilter} />
    </div>
    <div className="housekeeping-grid">
      {shown.map(r => <article key={r.number} className="housekeeping-card">
        <div className="housekeeping-card-top">
          <span className="room-number">#{r.number}</span>
          <Badge tone={colorFor(r.housekeeping)}>
            {r.housekeeping}
          </Badge>
        </div>
        <p>
          {r.type}
        </p>
        <div className="housekeeping-meta">
          <span>
            {t(L('Occupancy', 'Lưu trú'))}
          </span>
          <Status value={r.occupancy} />
        </div>
        <div className="housekeeping-meta">
          <span>
            {t(L('Assigned to', 'Giao cho'))}
          </span>
          <strong>
            {assignees[r.number] || '—'}
          </strong>
        </div>
        <div className="housekeeping-actions">
          <Button variant="secondary" onClick={() => { setSelected(r.number); setNote(r.notes); }}>
            {t(L('Manage task', 'Quản lý việc'))}
          </Button>
        </div>
      </article>)}
    </div>
    <InfoBanner>
      {t(L('Housekeeping readiness and occupancy are independent states. A vacant room may still need cleaning.', 'Tình trạng dọn phòng và lưu trú độc lập. Phòng đang trống vẫn có thể chưa sẵn sàng nhận khách.'))}
    </InfoBanner>
    {selected && <Modal
      title={`${t(L('Housekeeping — room', 'Buồng phòng — phòng'))} #${selected}`}
      onClose={() => setSelected(null)}
      footer={<Button variant="ghost" onClick={() => setSelected(null)}>
        {t(L('Close', 'Đóng'))}
      </Button>}>
      <div className="stack-fields">
        <NativeSelect
          label={t(L('Assigned staff', 'Nhân viên phụ trách'))}
          value={assignees[selected] ?? ''}
          onChange={e => setAssignees({ ...assignees, [selected]: e.target.value })}
          choices={[{ value: '', label: t(L('Unassigned', 'Chưa phân công')) }, { value: 'Thu Nguyen', label: 'Thu Nguyen' }, { value: 'Housekeeping team', label: t(L('Housekeeping team', 'Tổ buồng phòng')) }]} />
        <TextArea label={t(L('Damage or maintenance note', 'Ghi chú hư hỏng / bảo trì'))} rows={3} value={note} onChange={e => setNote(e.target.value)} />
        <div className="housekeeping-status-actions">
          <Button variant="secondary" onClick={() => change(selected, 'Dirty')}>
            {t(L('Mark dirty', 'Cần dọn'))}
          </Button>
          <Button variant="secondary" onClick={() => change(selected, 'Clean')}>
            {t(L('Mark clean', 'Đã dọn'))}
          </Button>
          <Button onClick={() => change(selected, 'Inspected')}>
            {t(L('Mark inspected', 'Đã kiểm tra'))}
          </Button>
        </div>
      </div>
    </Modal>}
    <Toast />
  </div>;
}

export function GuestsPage() {
  const { t, language } = useLocale();
  const { guests, reviews, bookings, update } = useDemoStore();
  const [tab, setTab] = useState('guests');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Guest | null>(null);
  const [reply, setReply] = useState<string | null>(null);
  const [response, setResponse] = useState('');
  const { notify, Toast } = useToast();
  return <div className="page-stack">
    <PageHeader

      title={t(L('Guests & reviews', 'Khách hàng & đánh giá'))}
      description={t(L('Know your guests, remember their preferences and respond thoughtfully.', 'Theo dõi lịch sử, nhu cầu của khách và phản hồi đánh giá.'))} />
    <div className="metric-grid three">
      <Metric label={t(L('Guest profiles', 'Hồ sơ khách'))} value={guests.length} icon="users" />
      <Metric label={t(L('Guest reviews', 'Đánh giá'))} value={reviews.length} icon="star" />
      <Metric label={t(L('Awaiting response', 'Cần phản hồi'))} value={reviews.filter(r => !r.reply).length} icon="clock" />
    </div>
    <Card>
      <Tabs
        items={[{ id: 'guests', label: t(L('Guest directory', 'Danh sách khách')) }, { id: 'reviews', label: t(L('Guest reviews', 'Đánh giá')) }]}
        value={tab}
        onChange={setTab} />
      {tab === 'guests' && <>
        <div className="table-toolbar">
          <SearchBox value={search} onChange={setSearch} placeholder={t(L('Search guest name or email…', 'Tìm tên khách hoặc email…'))} />
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>
                  {t(L('Guest', 'Khách'))}
                </th>
                <th>
                  {t(L('Profile', 'Phân loại'))}
                </th>
                <th>
                  {t(L('Stays', 'Số lần ở'))}
                </th>
                <th>
                  {t(L('Lifetime spending', 'Tổng chi tiêu'))}
                </th>
                <th>
                  {t(L('Preferences', 'Sở thích / ghi chú'))}
                </th>
                <th />
              </tr>
            </thead>
            <tbody>
              {guests.filter(g => (g.name + g.email).toLowerCase().includes(search.toLowerCase())).map(g => <tr key={g.email}>
                <td>
                  <strong>
                    {g.name}
                  </strong>
                  <small className="table-subtext">
                    {g.email}
                  </small>
                </td>
                <td>
                  <Status value={g.type} />
                </td>
                <td>
                  {g.visits}
                </td>
                <td>
                  {formatMoney(g.spent, language)}
                </td>
                <td>
                  {g.note || '—'}
                </td>
                <td>
                  <IconAction label={t(L('View guest', 'Xem khách'))} name="chevron" onClick={() => setSelected(g)} />
                </td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </>}
      {tab === 'reviews' && <div className="reviews-list">
        {reviews.map((r, i) => <div className="review-card" key={`${r.guest}-${r.date}`}>
          <div className="review-top">
            <div>
              <strong>
                {r.guest}
              </strong>
              <span>{r.room} · {r.date}</span>
            </div>
            <div className="review-rating">
              {'★'.repeat(r.stars)}
              {'☆'.repeat(5 - r.stars)}
            </div>
          </div>
          <p>
            {r.text}
          </p>
          {r.reply ? <div className="reply-box">
            <strong>
              {t(L('Hotel response', 'Phản hồi khách sạn'))}
            </strong>
            <p>
              {r.reply}
            </p>
          </div> : <Button variant="secondary" onClick={() => { setReply(String(i)); setResponse(''); }}>
            {t(L('Write a response', 'Viết phản hồi'))}
          </Button>}
        </div>)}
      </div>}
    </Card>
    {selected && <Modal
      title={selected.name}
      onClose={() => setSelected(null)}
      footer={<Button variant="secondary" onClick={() => setSelected(null)}>
        {t(L('Close', 'Đóng'))}
      </Button>}>
      <div className="stack-fields">
        <div className="summary-box">
          <div>
            <span>Email</span>
            <strong>
              {selected.email}
            </strong>
          </div>
          <div>
            <span>
              {t(L('Stay count', 'Số lượt ở'))}
            </span>
            <strong>
              {selected.visits}
            </strong>
          </div>
          <div>
            <span>
              {t(L('Profile', 'Phân loại'))}
            </span>
            <Status value={selected.type} />
          </div>
        </div>
        <TextArea
          label={t(L('Internal guest note', 'Ghi chú nội bộ'))}
          rows={4}
          value={selected.note}
          onChange={e => setSelected({ ...selected, note: e.target.value })} />
        <Button onClick={() => { update('guests', guests.map(g => g.email === selected.email ? selected : g)); setSelected(null); notify(t(L('Guest note updated.', 'Đã cập nhật ghi chú khách hàng.'))); }}>
          {t(L('Save note', 'Lưu ghi chú'))}
        </Button>
        <div className="detail-block">
          <span>
            {t(L('Related reservations', 'Booking liên quan'))}
          </span>
          {bookings.filter(b => b.email === selected.email).map(b => <strong key={b.id}>{b.id} · {b.roomType}</strong>)}
        </div>
      </div>
    </Modal>}
    {reply !== null && <Modal
      title={t(L('Reply to review', 'Phản hồi đánh giá'))}
      onClose={() => setReply(null)}
      footer={<>
        <Button variant="ghost" onClick={() => setReply(null)}>
          {t(L('Cancel', 'Hủy'))}
        </Button>
        <Button
          onClick={() => { update('reviews', reviews.map((r, i) => i === Number(reply) ? { ...r, reply: response, status: 'Published' } : r)); setReply(null); notify(t(L('This module is not available yet.', 'Chức năng này hiện chưa khả dụng.'))); }}
          disabled={!response.trim()}>
          {t(L('Publish response', 'Đăng phản hồi'))}
        </Button>
      </>}>
      <TextArea rows={5} label={t(L('Your response', 'Nội dung phản hồi'))} value={response} onChange={e => setResponse(e.target.value)} />
    </Modal>}
    <Toast />
  </div>;
}

export function PromotionsPage() {
  const { t, language } = useLocale();
  const { promotions, services, update } = useDemoStore();
  const [tab, setTab] = useState('promotions');
  const [promo, setPromo] = useState<Promotion | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const { notify, Toast } = useToast();
  return <div className="page-stack">
    <PageHeader

      title={t(L('Offers & extra services', 'Ưu đãi & dịch vụ bổ sung'))}
      description={t(L('Create meaningful offers and curated guest experiences.', 'Quản lý chương trình ưu đãi và những trải nghiệm dành cho khách.'))}
      action={<Button
        icon="plus"
        onClick={() => tab === 'promotions' ? setPromo({ code: '', type: 'Percent', value: 10, from: '2026-11-21', to: '2026-12-31', used: 0, limit: 100, status: 'Active' }) : setService({ name: '', unit: 'Per guest', price: 0, status: 'Active', category: 'Stay' })}>
        {tab === 'promotions' ? t(L('New promotion', 'Thêm ưu đãi')) : t(L('New service', 'Thêm dịch vụ'))}
      </Button>} />
    <div className="metric-grid three">
      <Metric label={t(L('Active promotions', 'Ưu đãi hiệu lực'))} value={promotions.filter(p => p.status === 'Active').length} icon="percent" />
      <Metric label={t(L('Extra services', 'Dịch vụ bổ sung'))} value={services.length} icon="sparkles" />
      <Metric label={t(L('Promotion redemptions', 'Lượt dùng ưu đãi'))} value={promotions.reduce((s, p) => s + p.used, 0)} icon="tag" />
    </div>
    <Card>
      <Tabs
        items={[{ id: 'promotions', label: t(L('Promotion codes', 'Mã khuyến mãi')) }, { id: 'services', label: t(L('Extra services', 'Dịch vụ bổ sung')) }]}
        value={tab}
        onChange={setTab} />
      {tab === 'promotions' ? <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>
                {t(L('Code', 'Mã'))}
              </th>
              <th>
                {t(L('Discount', 'Giảm giá'))}
              </th>
              <th>
                {t(L('Valid dates', 'Hiệu lực'))}
              </th>
              <th>
                {t(L('Usage', 'Đã dùng'))}
              </th>
              <th>
                {t(L('Status', 'Trạng thái'))}
              </th>
              <th />
            </tr>
          </thead>
          <tbody>
            {promotions.map(p => <tr key={p.code}>
              <td>
                <strong className="mono-link">
                  {p.code}
                </strong>
              </td>
              <td>
                {p.type === 'Percent' ? `${p.value}%` : formatMoney(p.value, language)}
              </td>
              <td>{p.from} — {p.to}</td>
              <td>{p.used}/{p.limit}<div className="progress-track thin">
                <span style={{ width: `${Math.min(100, p.used / Math.max(1, p.limit) * 100)}%` }} />
              </div></td>
              <td>
                <Status value={p.status} />
              </td>
              <td>
                <IconAction name="edit" label={t(L('Edit promotion', 'Sửa ưu đãi'))} onClick={() => setPromo({ ...p })} />
              </td>
            </tr>)}
          </tbody>
        </table>
      </div> : <div className="service-grid">
        {services.map((s, i) => <div className="service-card" key={`${s.name}-${i}`}>
          <div className="service-icon">
            <Icon name={s.category === 'Transport' ? 'door' : s.category === 'Dining' ? 'hotel' : 'sparkles'} />
          </div>
          <div>
            <strong>
              {s.name}
            </strong>
            <span>{s.category} · {s.unit}</span>
            <b>
              {formatMoney(s.price, language)}
            </b>
          </div>
          <IconAction name="edit" label={t(L('Edit service', 'Sửa dịch vụ'))} onClick={() => setService({ ...s })} />
        </div>)}
      </div>}
    </Card>
    {promo && <Modal
      title={t(L('Promotion settings', 'Cấu hình ưu đãi'))}
      onClose={() => setPromo(null)}
      footer={<>
        <Button variant="ghost" onClick={() => setPromo(null)}>
          {t(L('Cancel', 'Hủy'))}
        </Button>
        <Button onClick={() => { if (!promo.code.trim() || promo.to < promo.from) { notify(t(L('Check code and validity dates.', 'Kiểm tra mã và ngày hiệu lực.'))); return; } update('promotions', promotions.some(p => p.code === promo.code) ? promotions.map(p => p.code === promo.code ? promo : p) : [promo, ...promotions]); setPromo(null); notify(t(L('This module is not available yet.', 'Chức năng này hiện chưa khả dụng.'))); }}>
          {t(L('Save promotion', 'Lưu ưu đãi'))}
        </Button>
      </>}>
      <div className="stack-fields">
        <TextInput
          label={t(L('Promotion code', 'Mã khuyến mãi'))}
          value={promo.code}
          onChange={e => setPromo({ ...promo, code: e.target.value.toUpperCase() })} />
        <div className="form-grid two">
          <NativeSelect
            label={t(L('Discount type', 'Kiểu giảm giá'))}
            value={promo.type}
            onChange={e => setPromo({ ...promo, type: e.target.value })}
            choices={[{ value: 'Percent', label: t(L('Percentage', 'Phần trăm')) }, { value: 'Fixed', label: t(L('Fixed amount', 'Số tiền cố định')) }]} />
          {promo.type === 'Fixed' ? <MoneyInput min={0} label={t(L('Discount value', 'Giá trị giảm'))} value={promo.value} onValueChange={raw => setPromo({ ...promo, value: Number(raw) })} /> : <TextInput
            label={t(L('Discount value', 'Giá trị giảm'))}
            type="number"
            min={0}
            value={promo.value}
            onChange={e => setPromo({ ...promo, value: Number(e.target.value) })} />}
          <TextInput label={t(L('Start date', 'Ngày bắt đầu'))} type="date" value={promo.from} onChange={e => setPromo({ ...promo, from: e.target.value })} />
          <TextInput label={t(L('End date', 'Ngày kết thúc'))} type="date" value={promo.to} onChange={e => setPromo({ ...promo, to: e.target.value })} />
          <TextInput
            label={t(L('Usage limit', 'Giới hạn lượt dùng'))}
            type="number"
            min={1}
            value={promo.limit}
            onChange={e => setPromo({ ...promo, limit: Number(e.target.value) })} />
          <NativeSelect
            label={t(L('Status', 'Trạng thái'))}
            value={promo.status}
            onChange={e => setPromo({ ...promo, status: e.target.value })}
            choices={['Active', 'Inactive', 'Expired'].map(x => ({ value: x, label: x }))} />
        </div>
      </div>
    </Modal>}
    {service && <Modal
      title={t(L('Extra service', 'Dịch vụ bổ sung'))}
      onClose={() => setService(null)}
      footer={<>
        <Button variant="ghost" onClick={() => setService(null)}>
          {t(L('Cancel', 'Hủy'))}
        </Button>
        <Button onClick={() => { if (!service.name.trim()) return; update('services', services.some(s => s.name === service.name) ? services.map(s => s.name === service.name ? service : s) : [service, ...services]); setService(null); notify(t(L('This module is not available yet.', 'Chức năng này hiện chưa khả dụng.'))); }}>
          {t(L('Save service', 'Lưu dịch vụ'))}
        </Button>
      </>}>
      <div className="stack-fields">
        <TextInput label={t(L('Service name', 'Tên dịch vụ'))} value={service.name} onChange={e => setService({ ...service, name: e.target.value })} />
        <MoneyInput
          min={0}
          label={t(L('Unit price (VND)', 'Đơn giá (VND)'))}
          value={service.price}
          onValueChange={raw => setService({ ...service, price: Number(raw) })} />
        <div className="form-grid two">
          <NativeSelect
            label={t(L('Unit', 'Đơn vị'))}
            value={service.unit}
            onChange={e => setService({ ...service, unit: e.target.value })}
            choices={['Per guest', 'Per night', 'Per stay', 'Per ride', 'Per session'].map(x => ({ value: x, label: x }))} />
          <NativeSelect
            label={t(L('Status', 'Trạng thái'))}
            value={service.status}
            onChange={e => setService({ ...service, status: e.target.value })}
            choices={['Active', 'Inactive'].map(x => ({ value: x, label: x }))} />
        </div>
      </div>
    </Modal>}
    <Toast />
  </div>;
}
