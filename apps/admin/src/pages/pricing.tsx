import { IconAction } from '../components/ui';
import { MoneyInput } from '../components/money-input';
import { useState } from 'react';
import { L, formatMoney } from '../lib/domain';
import { useLocale } from '../lib/locale';
import { useDemoStore } from '../lib/demo-store';
import { Badge, Button, Card, InfoBanner, Modal, NativeSelect, PageHeader, Status, Tabs, TextInput, useToast } from '../components/ui';

const plans = [
  { id: 'standard', name: 'Standard Flexible', cancel: 'Free cancellation before deadline', adjust: 0, active: true },
  { id: 'nonref', name: 'Non-refundable', cancel: 'Non-refundable', adjust: -12, active: true },
  { id: 'breakfast', name: 'Breakfast Included', cancel: 'Flexible · includes breakfast', adjust: 15, active: true },
];
export function PricingPage() {
  const { t, language } = useLocale();
  const { roomTypes, update } = useDemoStore();
  const [tab, setTab] = useState('rates');
  const [roomId, setRoomId] = useState(roomTypes[0]?.id ?? 'DLX');
  const [dayRate, setDayRate] = useState('');
  const [modal, setModal] = useState(false);
  const { notify, Toast } = useToast();
  const selected = roomTypes.find(r => r.id === roomId) ?? roomTypes[0];
  return <div className="page-stack">
    <PageHeader

      title={t(L('Rates & pricing', 'Giá phòng & gói giá'))}
      description={t(L('Thoughtful pricing for every room type and rate plan.', 'Thiết lập giá theo từng hạng phòng và các gói giá.'))}
      action={<Button icon="plus" onClick={() => setModal(true)}>
        {t(L('Adjust rates', 'Điều chỉnh giá'))}
      </Button>} />
    <div className="metric-grid three">
      <div className="metric compact">
        <span>
          {t(L('Room categories', 'Hạng phòng'))}
        </span>
        <strong>
          {roomTypes.length}
        </strong>
      </div>
      <div className="metric compact">
        <span>
          {t(L('Rate plans', 'Gói giá'))}
        </span>
        <strong>
          {plans.length}
        </strong>
      </div>
      <div className="metric compact">
        <span>
          {t(L('Pricing currency', 'Đơn vị tiền'))}
        </span>
        <strong>VND</strong>
      </div>
    </div>
    <Tabs
      value={tab}
      onChange={setTab}
      items={[{ id: 'rates', label: t(L('Base rates', 'Giá cơ bản')) }, { id: 'calendar', label: t(L('Daily pricing', 'Giá theo ngày')) }, { id: 'plans', label: t(L('Rate plans', 'Gói giá')) }, { id: 'rules', label: t(L('Stay restrictions', 'Điều kiện lưu trú')) }]} />
    {tab === 'rates' && <Card
      title={t(L('Rates by room category', 'Giá theo hạng phòng'))}
      subtitle={t(L('All prices shown per room, per night.', 'Giá áp dụng cho một phòng, một đêm.'))}>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>
                {t(L('Room category', 'Hạng phòng'))}
              </th>
              <th>
                {t(L('Base price', 'Giá cơ bản'))}
              </th>
              <th>
                {t(L('Status', 'Trạng thái'))}
              </th>
              <th>
                {t(L('Rate plans', 'Gói giá'))}
              </th>
              <th />
            </tr>
          </thead>
          <tbody>
            {roomTypes.map(r => <tr key={r.id}>
              <td>
                <strong>
                  {r.name}
                </strong>
                <small className="table-subtext">{r.size} m² · {r.capacity} {t(L('guests', 'khách'))}</small>
              </td>
              <td>
                <strong>
                  {formatMoney(r.price, language)}
                </strong>
              </td>
              <td>
                <Status value={r.status} />
              </td>
              <td>
                {plans.length}
                {t(L('plans', 'gói'))}
              </td>
              <td>
                <IconAction name="edit" label={t(L('Edit price', 'Sửa giá'))} onClick={() => { setRoomId(r.id); setModal(true); }} />
              </td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </Card>}
    {tab === 'calendar' && <Card
      title={t(L('Daily rate calendar', 'Lịch giá theo ngày'))}
    >
      <div className="table-toolbar">
        <NativeSelect
          label={t(L('Room category', 'Hạng phòng'))}
          value={roomId}
          onChange={e => setRoomId(e.target.value)}
          choices={roomTypes.map(r => ({ value: r.id, label: r.name }))} />
      </div>
      <div className="rate-grid">
        {Array.from({ length: 14 }, (_, i) => {
          const d = new Date('2026-11-21T12:00:00'); d.setDate(d.getDate() + i); const weekend = [0, 6].includes(d.getDay()); return <div className={`rate-day ${weekend ? 'weekend' : ''}`} key={i}>
            <span>
              {new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-US', { weekday: 'short' }).format(d)}
            </span>
            <strong>
              {d.getDate()}
            </strong>
            <small>
              {formatMoney(Math.round((selected?.price ?? 0) * (weekend ? 1.15 : 1)), language)}
            </small>
          </div>;
        })}
      </div>
      <div className="subtle-note">
      </div>
    </Card>}
    {tab === 'plans' && <div className="rate-plan-grid">
      {plans.map(plan => <Card key={plan.id} title={plan.name} action={<Badge tone="success">
        {t(L('Active', 'Đang dùng'))}
      </Badge>}>
        <p className="plan-description">
          {plan.cancel}
        </p>
        <div className="plan-adjustment">{plan.adjust > 0 ? '+' : ''}{plan.adjust}% <small>
          {t(L('vs. base rate', 'so với giá gốc'))}
        </small></div>
        <Button variant="secondary" onClick={() => notify(t(L('This module is not available yet.', 'Chức năng này hiện chưa khả dụng.')))}>
          {t(L('View details', 'Xem chi tiết'))}
        </Button>
      </Card>)}
    </div>}
    {tab === 'rules' && <div className="two-column-layout">
      <Card title={t(L('Stay rules', 'Quy định lưu trú'))}>
        <div className="form-grid two">
          <TextInput type="number" min={1} defaultValue={1} label={t(L('Minimum nights', 'Số đêm tối thiểu'))} />
          <TextInput type="number" min={1} defaultValue={30} label={t(L('Maximum nights', 'Số đêm tối đa'))} />
        </div>
        <div className="form-grid two top-gap">
          <TextInput type="number" min={1} defaultValue={1} label={t(L('Minimum guests', 'Số khách tối thiểu'))} />
          <TextInput type="number" min={1} defaultValue={3} label={t(L('Maximum guests', 'Số khách tối đa'))} />
        </div>
        <div className="top-gap">
          <Button onClick={() => notify(t(L('This module is not available yet.', 'Chức năng này hiện chưa khả dụng.')))}>
            {t(L('Save rules', 'Lưu quy định'))}
          </Button>
        </div>
      </Card>
      <Card title={t(L('Advanced restrictions', 'Quy định nâng cao'))}>
        <div className="stack-fields">
          <div className="settings-line">
            <span>
              {t(L('Closed to arrival', 'Không cho nhận phòng'))}
            </span>
            <Badge tone="neutral">
              {t(L('Not configured', 'Chưa cấu hình'))}
            </Badge>
          </div>
          <div className="settings-line">
            <span>
              {t(L('Closed to departure', 'Không cho trả phòng'))}
            </span>
            <Badge tone="neutral">
              {t(L('Not configured', 'Chưa cấu hình'))}
            </Badge>
          </div>
          <InfoBanner>
            {t(L('Restrictions are shown for specification coverage only.', 'Các điều kiện này được trình bày để bao phủ giao diện theo Kickoff.'))}
          </InfoBanner>
        </div>
      </Card>
    </div>}
    {modal && <Modal
      title={t(L('Adjust a base rate', 'Điều chỉnh giá cơ bản'))}
      onClose={() => setModal(false)}
      footer={<>
        <Button variant="ghost" onClick={() => setModal(false)}>
          {t(L('Cancel', 'Hủy'))}
        </Button>
        <Button onClick={() => { const value = Number(dayRate || selected?.price); if (!Number.isFinite(value) || value < 0) return; update('roomTypes', roomTypes.map(r => r.id === roomId ? { ...r, price: value } : r)); setModal(false); setDayRate(''); notify(t(L('This module is not available yet.', 'Chức năng này hiện chưa khả dụng.'))); }}>
          {t(L('Save rate', 'Lưu giá'))}
        </Button>
      </>}>
      <div className="stack-fields">
        <NativeSelect
          label={t(L('Room category', 'Hạng phòng'))}
          choices={roomTypes.map(r => ({ value: r.id, label: r.name }))}
          value={roomId}
          onChange={e => setRoomId(e.target.value)} />
        <MoneyInput
          min={0}
          label={t(L('Price per night (VND)', 'Giá mỗi đêm (VND)'))}
          value={dayRate}
          placeholder={String(selected?.price ?? 0)}
          onValueChange={raw => setDayRate(raw)} />

      </div>
    </Modal>}
    <Toast />
  </div>;
}
