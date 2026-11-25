import { useState, type FormEvent } from 'react';
import { L, formatMoney, type Room, type RoomType } from '../lib/domain';
import { useLocale } from '../lib/locale';
import { useDemoStore } from '../lib/demo-store';
import { Badge, Button, Card, FileUploadField, Icon, IconAction, InfoBanner, Modal, NativeSelect, PageHeader, SearchBox, Status, Switch, Tabs, TextArea, TextInput, useToast } from '../components/ui';

const propertyTabs = [
  { id: 'details', label: L('Property details', 'Thông tin khách sạn') },
  { id: 'content', label: L('Website content', 'Nội dung website') },
  { id: 'policies', label: L('Policies', 'Chính sách') },
  { id: 'gallery', label: L('Gallery & amenities', 'Hình ảnh & tiện ích') },
];
export function HotelContent() {
  const { t, language } = useLocale();
  const [tab, setTab] = useState('details');
  const [settings, setSettings] = useState(() => {
    const defaults = { name: 'Dylan Grand Hotel', email: 'reservations@dylangrand.example', phone: '+84 28 0000 0000', address: 'Ho Chi Minh City, Vietnam', checkIn: '14:00', checkOut: '12:00', headline: 'The art of feeling at home.', headlineVi: 'Nghệ thuật của cảm giác như ở nhà.', description: 'An intimate escape in the heart of Saigon.', descriptionVi: 'Nơi nghỉ dưỡng tinh tế giữa lòng Sài Gòn.', cancellation: 'Free cancellation before the policy deadline.', faq: 'What time is check-in? — 2:00 PM', privacy: 'Your information is treated with care.' };
    try {
      const saved = JSON.parse(localStorage.getItem('dgh-admin-hotel-settings') ?? 'null') as Partial<typeof defaults> | null;
      return saved ? { ...defaults, ...saved } : defaults;
    } catch {
      return defaults;
    }
  });
  const [amenities, setAmenities] = useState(['Complimentary Wi-Fi', 'Breakfast', 'Spa', 'Airport transfer', 'Room service']);
  const [galleryPhotos, setGalleryPhotos] = useState<string[]>([]);
  const { notify, Toast } = useToast();
  const saveSettings = () => {
    try { localStorage.setItem('dgh-admin-hotel-settings', JSON.stringify(settings)); } catch { /* Optional demo storage. */ }
    notify(t(L('This module is not available yet.', 'Chức năng này hiện chưa khả dụng.')));
  };
  const change = (key: keyof typeof settings, value: string) => setSettings(v => ({ ...v, [key]: value }));
  const fields = (items: { key: keyof typeof settings; label: string; }[]) => items.map(item => <TextInput key={item.key} label={item.label} value={settings[item.key]} onChange={e => change(item.key, e.target.value)} />);
  return <div className="page-stack">
    <PageHeader
      
      title={t(L('Hotel information', 'Thông tin khách sạn'))}
      description={t(L('Manage the identity, content and public-facing hotel details.', 'Quản lý nhận diện, nội dung và thông tin hiển thị trên website.'))}
      action={<Button icon="check" onClick={saveSettings}>
        {t(L('Save changes', 'Lưu thay đổi'))}
      </Button>} />
    <Tabs items={propertyTabs.map(x => ({ id: x.id, label: t(x.label) }))} value={tab} onChange={setTab} />
    {tab === 'details' && <div className="two-column-layout">
      <Card title={t(L('General information', 'Thông tin chung'))} subtitle={t(L('Primary property details', 'Thông tin chính của khách sạn'))}>
        <div className="form-grid two">
          {fields([{ key: 'name', label: t(L('Hotel name', 'Tên khách sạn')) }, { key: 'email', label: 'Email' }, { key: 'phone', label: t(L('Phone number', 'Số điện thoại')) }, { key: 'address', label: t(L('Location', 'Địa điểm')) }])}
        </div>
        <div className="form-grid two top-gap">
          {fields([{ key: 'checkIn', label: t(L('Standard check-in', 'Giờ nhận phòng')) }, { key: 'checkOut', label: t(L('Standard check-out', 'Giờ trả phòng')) }])}
        </div>
      </Card>
      <Card title={t(L('Property identity', 'Nhận diện khách sạn'))}>
        <div className="brand-preview">
          <div className="admin-brand-stacked" role="img" aria-label="Dylan Grand Hotel — Art Deco logo" />
          <p>
            {t(L('A refined stay, thoughtfully curated.', 'Một kỳ nghỉ tinh tế, được chăm chút.'))}
          </p>
        </div>
        
      </Card>
    </div>}
    {tab === 'content' && <div className="two-column-layout">
      <Card title={t(L('Hero & introduction', 'Hero & giới thiệu'))}>
        <div className="stack-fields">
          <TextInput label={t(L('Headline (English)', 'Tiêu đề (tiếng Anh)'))} value={settings.headline} onChange={e => change('headline', e.target.value)} />
          <TextInput
            label={t(L('Headline (Vietnamese)', 'Tiêu đề (tiếng Việt)'))}
            value={settings.headlineVi}
            onChange={e => change('headlineVi', e.target.value)} />
          <TextArea
            rows={4}
            label={t(L('Description (English)', 'Mô tả (tiếng Anh)'))}
            value={settings.description}
            onChange={e => change('description', e.target.value)} />
          <TextArea
            rows={4}
            label={t(L('Description (Vietnamese)', 'Mô tả (tiếng Việt)'))}
            value={settings.descriptionVi}
            onChange={e => change('descriptionVi', e.target.value)} />
        </div>
      </Card>
      <Card title={t(L('Live content preview', 'Xem trước nội dung'))}>
        <div className="content-preview">
          <div className="eyebrow">DYLAN GRAND HOTEL</div>
          <h3>
            {language === 'en' ? settings.headline : settings.headlineVi}
          </h3>
          <p>
            {language === 'en' ? settings.description : settings.descriptionVi}
          </p>
          <span>
            {t(L('Discover our rooms →', 'Khám phá hạng phòng →'))}
          </span>
        </div>
      </Card>
    </div>}
    {tab === 'policies' && <div className="two-column-layout">
      <Card title={t(L('Hotel policies', 'Chính sách khách sạn'))}>
        <div className="stack-fields">
          <TextArea
            rows={6}
            label={t(L('Cancellation policy', 'Chính sách hủy'))}
            value={settings.cancellation}
            onChange={e => change('cancellation', e.target.value)} />
          <TextArea rows={5} label={t(L('Privacy statement', 'Chính sách riêng tư'))} value={settings.privacy} onChange={e => change('privacy', e.target.value)} />
        </div>
      </Card>
      <Card title={t(L('Frequently asked questions', 'Câu hỏi thường gặp'))}>
        <TextArea rows={8} label="FAQ" value={settings.faq} onChange={e => change('faq', e.target.value)} />
        <InfoBanner>
          {t(L('Hotel policies will require backend integration before publishing.', 'Chính sách cần được kết nối backend trước khi xuất bản.'))}
        </InfoBanner>
      </Card>
    </div>}
    {tab === 'gallery' && <div className="two-column-layout">
      <Card title={t(L('Hotel amenities', 'Tiện ích khách sạn'))}>
        <div className="amenity-grid">
          {amenities.map(a => <label className="amenity-check" key={a}>
            <input type="checkbox" defaultChecked />
            <span>
              {a}
            </span>
          </label>)}
        </div>
        <div className="inline-form top-gap">
          <TextInput placeholder={t(L('Add an amenity…', 'Thêm tiện ích…'))} id="new-amenity" />
          <Button
            variant="secondary"
            icon="plus"
            onClick={() => { const input = document.getElementById('new-amenity') as HTMLInputElement | null; if (input?.value.trim()) { setAmenities(a => [...a, input.value.trim()]); input.value = ''; } }}>
            {t(L('Add', 'Thêm'))}
          </Button>
        </div>
      </Card>
      <Card title={t(L('Photo library', 'Thư viện ảnh'))}>
        <FileUploadField
          label={t(L('Feature photo uploader', 'Tải ảnh nổi bật'))}
          value={galleryPhotos[0] ?? ''}
          onChange={(next) => setGalleryPhotos((current) => next ? [next, ...current.filter((_, index) => index !== 0)] : current.slice(1))}
          help={t(L('This reusable upload control is ready to be shared across admin forms when other image fields are added.', 'Bộ chọn ảnh này được thiết kế để có thể tái sử dụng cho các form admin khác khi bổ sung thêm trường hình ảnh.'))} />
        <div className="gallery-tiles top-gap">
          <div className="gallery-tile tall">
            <img alt="Concept hotel interior" src={galleryPhotos[0] ?? 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=80'} />
          </div>
          <div className="gallery-tile">
            <img alt="Concept hotel room" src={galleryPhotos[1] ?? 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=600&q=80'} />
          </div>
          <div className="gallery-tile">
            <img alt="Concept hospitality service" src={galleryPhotos[2] ?? 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=600&q=80'} />
          </div>
        </div>
        <p className="image-disclaimer">
        </p>
      </Card>
    </div>}
    <Toast />
  </div>;
}

export function RoomTypesPage() {
  const { t, language } = useLocale();
  const { roomTypes, update, rooms } = useDemoStore();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<RoomType | null>(null);
  const [draft, setDraft] = useState<RoomType | null>(null);
  const { notify, Toast } = useToast();
  const open = (room?: RoomType) => { const value = room ?? { id: `RT-${Date.now().toString().slice(-5)}`, name: '', size: 32, beds: 'King', capacity: 2, price: 0, status: 'Draft', amenities: [], image: '', description: '' }; setEditing(value); setDraft({ ...value, amenities: [...value.amenities] }); };
  const save = (e: FormEvent) => { e.preventDefault(); if (!draft) return; update('roomTypes', editing && roomTypes.some(r => r.id === editing.id) ? roomTypes.map(r => r.id === draft.id ? draft : r) : [...roomTypes, draft]); setDraft(null); setEditing(null); notify(t(L('This module is not available yet.', 'Chức năng này hiện chưa khả dụng.'))); };
  const filtered = roomTypes.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));
  return <div className="page-stack">
    <PageHeader
      
      title={t(L('Rooms & suites', 'Hạng phòng & suite'))}
      description={t(L('Curate the room categories shown to your guests.', 'Quản lý các hạng phòng được giới thiệu và mở bán cho khách.'))}
      action={<Button icon="plus" onClick={() => open()}>
        {t(L('Add room type', 'Thêm hạng phòng'))}
      </Button>} />
    <div className="toolbar">
      <SearchBox value={search} onChange={setSearch} placeholder={t(L('Search room types…', 'Tìm hạng phòng…'))} />
      <div className="toolbar-meta">
        {filtered.length}
        {t(L('room types', 'hạng phòng'))}
      </div>
    </div>
    <div className="room-type-grid">
      {filtered.map(r => <article className="room-type-card" key={r.id}>
        <div className="room-type-image">
          {r.image ? <img src={r.image} alt={`${r.name} concept room`} /> : <div className="image-fallback">
            <Icon name="bed" size={36} />
          </div>}
          <div className="image-corner">
            <Status value={r.status} />
          </div>
        </div>
        <div className="room-type-body">
          <div className="room-type-title">
            <h2>
              {r.name}
            </h2>
            <IconAction name="edit" label={t(L('Edit room type', 'Sửa hạng phòng'))} onClick={() => open(r)} />
          </div>
          <p>
            {r.description}
          </p>
          <div className="room-specs">
            <span>
              <Icon name="bed" size={15} />
              {r.beds}
            </span>
            <span>{r.size} m²</span>
            <span>
              {r.capacity}
              {t(L('guests', 'khách'))}
            </span>
          </div>
          <div className="room-type-bottom">
            <div>
              <small>
                {t(L('From / night', 'Từ / đêm'))}
              </small>
              <strong>
                {formatMoney(r.price, language)}
              </strong>
            </div>
            <span>
              {rooms.filter(room => room.type === r.name).length}
              {t(L('physical rooms', 'phòng vật lý'))}
            </span>
          </div>
        </div>
      </article>)}
    </div>
    {draft && <Modal
      title={t(L('Edit room category', 'Chỉnh sửa hạng phòng'))}
      onClose={() => setDraft(null)}
      width="lg"
      footer={<>
        <Button variant="ghost" onClick={() => setDraft(null)}>
          {t(L('Cancel', 'Hủy'))}
        </Button>
        <Button onClick={() => document.getElementById('room-type-submit')?.click()}>
          {t(L('Save room type', 'Lưu hạng phòng'))}
        </Button>
      </>}>
      <form id="room-type-form" onSubmit={save} className="stack-fields">
        <div className="form-grid two">
          <TextInput label={t(L('Category name', 'Tên hạng phòng'))} required value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} />
          <TextInput
            label={t(L('Size (m²)', 'Diện tích (m²)'))}
            type="number"
            min={1}
            required
            value={draft.size}
            onChange={e => setDraft({ ...draft, size: Number(e.target.value) })} />
          <TextInput label={t(L('Bed arrangement', 'Loại giường'))} value={draft.beds} onChange={e => setDraft({ ...draft, beds: e.target.value })} />
          <TextInput
            label={t(L('Maximum guests', 'Sức chứa tối đa'))}
            type="number"
            min={1}
            value={draft.capacity}
            onChange={e => setDraft({ ...draft, capacity: Number(e.target.value) })} />
          <TextInput
            label={t(L('Base rate (VND)', 'Giá cơ bản (VND)'))}
            type="number"
            min={0}
            value={draft.price}
            onChange={e => setDraft({ ...draft, price: Number(e.target.value) })} />
          <NativeSelect
            label={t(L('Publication status', 'Trạng thái mở bán'))}
            value={draft.status}
            onChange={e => setDraft({ ...draft, status: e.target.value })}
            choices={['Published', 'Hidden', 'Draft'].map(s => ({ value: s, label: s }))} />
        </div>
        <FileUploadField
          label={t(L('Room hero image', 'Ảnh đại diện hạng phòng'))}
          value={draft.image}
          onChange={(next) => setDraft({ ...draft, image: next })}
           />
        <TextInput
          label={t(L('Amenities (comma separated)', 'Tiện ích (cách nhau bằng dấu phẩy)'))}
          value={draft.amenities.join(', ')}
          onChange={e => setDraft({ ...draft, amenities: e.target.value.split(',').map(x => x.trim()).filter(Boolean) })} />
        <TextArea rows={3} label={t(L('Description', 'Mô tả'))} value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} />
        <button id="room-type-submit" type="submit" hidden />
      </form>
    </Modal>}
    <Toast />
  </div>;
}

export function PhysicalRoomsPage() {
  const { t } = useLocale();
  const { rooms, roomTypes, update } = useDemoStore();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');
  const [draft, setDraft] = useState<Room | null>(null);
  const [original, setOriginal] = useState<string | null>(null);
  const { notify, Toast } = useToast();
  const filtered = rooms.filter(r => (r.number + r.type).toLowerCase().includes(query.toLowerCase()) && (status === 'All' || r.occupancy === status));
  const open = (r?: Room) => { setOriginal(r?.number ?? null); setDraft(r ? { ...r } : { number: '', floor: 2, type: roomTypes[0]?.name ?? 'Deluxe Room', occupancy: 'Vacant', housekeeping: 'Clean', sellable: true, notes: '' }); };
  const save = (e: FormEvent) => { e.preventDefault(); if (!draft) return; if (rooms.some(r => r.number === draft.number && r.number !== original)) { notify(t(L('Room number already exists.', 'Số phòng đã tồn tại.'))); return; } update('rooms', original ? rooms.map(r => r.number === original ? draft : r) : [...rooms, draft]); setDraft(null); notify(t(L('This module is not available yet.', 'Chức năng này hiện chưa khả dụng.'))); };
  return <div className="page-stack">
    <PageHeader
      
      title={t(L('Room directory', 'Danh sách phòng vật lý'))}
      description={t(L('Manage individual rooms, floors, sellability and maintenance.', 'Quản lý từng phòng, tầng, khả năng bán và tình trạng bảo trì.'))}
      action={<Button icon="plus" onClick={() => open()}>
        {t(L('Add physical room', 'Thêm phòng vật lý'))}
      </Button>} />
    <div className="metric-grid three">
      <div className="metric compact">
        <span>
          {t(L('Total rooms', 'Tổng phòng'))}
        </span>
        <strong>
          {rooms.length}
        </strong>
      </div>
      <div className="metric compact">
        <span>
          {t(L('Sellable rooms', 'Phòng mở bán'))}
        </span>
        <strong>
          {rooms.filter(r => r.sellable).length}
        </strong>
      </div>
      <div className="metric compact">
        <span>
          {t(L('Under maintenance', 'Đang bảo trì'))}
        </span>
        <strong>
          {rooms.filter(r => !r.sellable).length}
        </strong>
      </div>
    </div>
    <Card>
      <div className="table-toolbar">
        <SearchBox value={query} onChange={setQuery} placeholder={t(L('Search room number or category', 'Tìm số phòng hoặc hạng phòng'))} />
        <NativeSelect
          value={status}
          onChange={e => setStatus(e.target.value)}
          choices={['All', 'Vacant', 'Reserved', 'Occupied', 'Maintenance'].map(s => ({ value: s, label: s === 'All' ? t(L('All statuses', 'Mọi trạng thái')) : s }))} />
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>
                {t(L('Room', 'Phòng'))}
              </th>
              <th>
                {t(L('Floor', 'Tầng'))}
              </th>
              <th>
                {t(L('Room type', 'Hạng phòng'))}
              </th>
              <th>
                {t(L('Occupancy', 'Lưu trú'))}
              </th>
              <th>
                {t(L('Housekeeping', 'Dọn phòng'))}
              </th>
              <th>
                {t(L('Sellability', 'Mở bán'))}
              </th>
              <th>
                {t(L('Internal note', 'Ghi chú'))}
              </th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => <tr key={r.number}>
              <td>
                <strong>#{r.number}</strong>
              </td>
              <td>
                {r.floor}
              </td>
              <td>
                {r.type}
              </td>
              <td>
                <Status value={r.occupancy} />
              </td>
              <td>
                <Status value={r.housekeeping} />
              </td>
              <td>
                <Badge tone={r.sellable ? 'success' : 'danger'}>
                  {r.sellable ? t(L('Enabled', 'Đang bán')) : t(L('Blocked', 'Đã chặn'))}
                </Badge>
              </td>
              <td>
                {r.notes || '—'}
              </td>
              <td>
                <IconAction name="edit" label={t(L('Edit room', 'Sửa phòng'))} onClick={() => open(r)} />
              </td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </Card>
    {draft && <Modal
      title={t(L('Room information', 'Thông tin phòng'))}
      onClose={() => setDraft(null)}
      footer={<>
        <Button variant="ghost" onClick={() => setDraft(null)}>
          {t(L('Cancel', 'Hủy'))}
        </Button>
        <Button onClick={() => document.getElementById('save-physical-room')?.click()}>
          {t(L('Save', 'Lưu'))}
        </Button>
      </>}>
      <form className="stack-fields" onSubmit={save}>
        <div className="form-grid two">
          <TextInput required label={t(L('Room number', 'Số phòng'))} value={draft.number} onChange={e => setDraft({ ...draft, number: e.target.value })} />
          <TextInput
            required
            label={t(L('Floor', 'Tầng'))}
            type="number"
            value={draft.floor}
            onChange={e => setDraft({ ...draft, floor: Number(e.target.value) })} />
          <NativeSelect
            label={t(L('Room type', 'Hạng phòng'))}
            value={draft.type}
            onChange={e => setDraft({ ...draft, type: e.target.value })}
            choices={roomTypes.map(r => ({ value: r.name, label: r.name }))} />
          <NativeSelect
            label={t(L('Occupancy status', 'Trạng thái lưu trú'))}
            value={draft.occupancy}
            onChange={e => setDraft({ ...draft, occupancy: e.target.value })}
            choices={['Vacant', 'Occupied', 'Reserved', 'Maintenance'].map(x => ({ value: x, label: x }))} />
          <NativeSelect
            label={t(L('Housekeeping', 'Dọn phòng'))}
            value={draft.housekeeping}
            onChange={e => setDraft({ ...draft, housekeeping: e.target.value })}
            choices={['Dirty', 'Clean', 'Inspected'].map(x => ({ value: x, label: x }))} />
        </div>
        <Switch checked={draft.sellable} onChange={sellable => setDraft({ ...draft, sellable })} label={t(L('Available for sale', 'Được phép bán'))} />
        <TextArea rows={3} label={t(L('Internal notes', 'Ghi chú nội bộ'))} value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} />
        <button type="submit" id="save-physical-room" hidden />
      </form>
    </Modal>}
    <Toast />
  </div>;
}
