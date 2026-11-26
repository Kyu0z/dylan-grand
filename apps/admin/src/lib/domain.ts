export type Language = 'en' | 'vi';
export type Localized = { en: string; vi: string; };
export type ModuleId = `ad-${'01' | '02' | '03' | '04' | '05' | '06' | '07' | '08' | '09' | '10' | '11' | '12' | '13' | '14'}`;
export type NavEntry = { id: ModuleId; path: string; label: Localized; group: 'overview' | 'property' | 'operations' | 'business'; };
export const nav: NavEntry[] = [
  { id: 'ad-01', path: '/dashboard', label: { en: 'Overview', vi: 'Tổng quan' }, group: 'overview' },
  { id: 'ad-02', path: '/hotel', label: { en: 'Hotel content', vi: 'Nội dung khách sạn' }, group: 'property' },
  { id: 'ad-03', path: '/room-types', label: { en: 'Room types', vi: 'Hạng phòng' }, group: 'property' },
  { id: 'ad-04', path: '/physical-rooms', label: { en: 'Physical rooms', vi: 'Phòng vật lý' }, group: 'property' },
  { id: 'ad-05', path: '/inventory', label: { en: 'Inventory calendar', vi: 'Lịch tồn phòng' }, group: 'operations' },
  { id: 'ad-06', path: '/pricing', label: { en: 'Rates & pricing', vi: 'Giá & gói giá' }, group: 'business' },
  { id: 'ad-07', path: '/reservations', label: { en: 'Reservations', vi: 'Đặt phòng' }, group: 'operations' },
  { id: 'ad-08', path: '/front-desk', label: { en: 'Front desk', vi: 'Lễ tân' }, group: 'operations' },
  { id: 'ad-09', path: '/payments', label: { en: 'Payments & refunds', vi: 'Thanh toán & hoàn tiền' }, group: 'business' },
  { id: 'ad-10', path: '/housekeeping', label: { en: 'Housekeeping', vi: 'Buồng phòng' }, group: 'operations' },
  { id: 'ad-11', path: '/guests', label: { en: 'Guests & reviews', vi: 'Khách hàng & đánh giá' }, group: 'business' },
  { id: 'ad-12', path: '/promotions', label: { en: 'Promotions & services', vi: 'Ưu đãi & dịch vụ' }, group: 'business' },
  { id: 'ad-13', path: '/staff', label: { en: 'Staff & roles', vi: 'Nhân sự & vai trò' }, group: 'business' },
  { id: 'ad-14', path: '/reports', label: { en: 'Reports & analytics', vi: 'Báo cáo & phân tích' }, group: 'business' },
];
export const L = (en: string, vi: string): Localized => ({ en, vi });
export const formatMoney = (value: number, lang: Language) => new Intl.NumberFormat(lang === 'vi' ? 'vi-VN' : 'en-US', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
export const formatDate = (date: string, _lang: Language) => {
  if (!date) return '—';
  const parsed = new Date(`${date.slice(0, 10)}T12:00:00`);
  return Number.isNaN(parsed.valueOf()) ? '—' : date.slice(0, 10).split('-').reverse().join('/');
};
export const todayISO = () => new Date().toISOString().slice(0, 10);

export type Reservation = { id: string; guest: string; email: string; roomType: string; room: string; checkIn: string; checkOut: string; status: string; payment: string; total: number; channel: string; notes: string; };
export type RoomType = { id: string; name: string; size: number; beds: string; capacity: number; price: number; status: string; amenities: string[]; image: string; description: string; };
export type Room = { number: string; floor: number; type: string; occupancy: string; housekeeping: string; sellable: boolean; notes: string; };
export type Payment = { id: string; booking: string; guest: string; amount: number; method: string; date: string; status: string; kind: string; };
export type Staff = { name: string; role: string; email: string; status: string; shift: string; };
export type Guest = { name: string; email: string; visits: number; spent: number; type: string; note: string; };
export type Promotion = { code: string; type: string; value: number; from: string; to: string; used: number; limit: number; status: string; };
export type Service = { name: string; unit: string; price: number; status: string; category: string; };
export type Review = { guest: string; room: string; stars: number; date: string; text: string; reply: string; status: string; };

const roomPhotos = {
  deluxe: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=82',
  premier: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=82',
  suite: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=82',
};
export const demoRoomTypes: RoomType[] = [
  { id: 'DLX', name: 'Deluxe Room', size: 32, beds: 'King', capacity: 2, price: 1850000, status: 'Published', amenities: ['Wi-Fi', 'Rain shower', 'Minibar'], image: roomPhotos.deluxe, description: 'A calm retreat with thoughtful details and warm materials.' },
  { id: 'PRM', name: 'Premier Room', size: 40, beds: 'King / Twin', capacity: 2, price: 2450000, status: 'Published', amenities: ['Wi-Fi', 'City view', 'Bathtub'], image: roomPhotos.premier, description: 'Spacious comfort with a considered contemporary design.' },
  { id: 'STE', name: 'Grand Suite', size: 64, beds: 'King', capacity: 3, price: 4200000, status: 'Published', amenities: ['Wi-Fi', 'Lounge', 'Bathtub'], image: roomPhotos.suite, description: 'An intimate private suite with room to unwind.' },
];
export const demoRooms: Room[] = [
  { number: '201', floor: 2, type: 'Deluxe Room', occupancy: 'Occupied', housekeeping: 'Clean', sellable: true, notes: '' },
  { number: '202', floor: 2, type: 'Deluxe Room', occupancy: 'Vacant', housekeeping: 'Clean', sellable: true, notes: '' },
  { number: '203', floor: 2, type: 'Deluxe Room', occupancy: 'Reserved', housekeeping: 'Inspected', sellable: true, notes: '' },
  { number: '204', floor: 2, type: 'Deluxe Room', occupancy: 'Vacant', housekeeping: 'Dirty', sellable: true, notes: 'Late checkout' },
  { number: '205', floor: 2, type: 'Deluxe Room', occupancy: 'Maintenance', housekeeping: 'Dirty', sellable: false, notes: 'Air conditioning' },
  { number: '301', floor: 3, type: 'Premier Room', occupancy: 'Occupied', housekeeping: 'Clean', sellable: true, notes: '' },
  { number: '302', floor: 3, type: 'Premier Room', occupancy: 'Reserved', housekeeping: 'Inspected', sellable: true, notes: '' },
  { number: '303', floor: 3, type: 'Premier Room', occupancy: 'Vacant', housekeeping: 'Clean', sellable: true, notes: '' },
  { number: '304', floor: 3, type: 'Premier Room', occupancy: 'Vacant', housekeeping: 'Dirty', sellable: true, notes: '' },
  { number: '401', floor: 4, type: 'Grand Suite', occupancy: 'Occupied', housekeeping: 'Clean', sellable: true, notes: '' },
  { number: '402', floor: 4, type: 'Grand Suite', occupancy: 'Vacant', housekeeping: 'Inspected', sellable: true, notes: '' },
  { number: '403', floor: 4, type: 'Grand Suite', occupancy: 'Reserved', housekeeping: 'Clean', sellable: true, notes: '' },
];
export const demoBookings: Reservation[] = [
  { id: 'DGH-260101', guest: 'Sophia Nguyen', email: 'sophia@example.com', roomType: 'Grand Suite', room: '401', checkIn: '2026-11-19', checkOut: '2026-11-23', status: 'Checked-in', payment: 'Paid', total: 16800000, channel: 'Website', notes: 'Quiet upper floor' },
  { id: 'DGH-260102', guest: 'Alex Chen', email: 'alex@example.com', roomType: 'Deluxe Room', room: '203', checkIn: '2026-11-21', checkOut: '2026-11-24', status: 'Confirmed', payment: 'Paid', total: 5550000, channel: 'Website', notes: 'Airport pickup' },
  { id: 'DGH-260103', guest: 'Emma Wilson', email: 'emma@example.com', roomType: 'Premier Room', room: '302', checkIn: '2026-11-21', checkOut: '2026-11-25', status: 'Confirmed', payment: 'Partially Paid', total: 9800000, channel: 'Phone', notes: 'Anniversary stay' },
  { id: 'DGH-260104', guest: 'Minh Tran', email: 'minh@example.com', roomType: 'Deluxe Room', room: '202', checkIn: '2026-11-22', checkOut: '2026-11-24', status: 'Pending', payment: 'Unpaid', total: 3700000, channel: 'Website', notes: '' },
  { id: 'DGH-260105', guest: 'Oliver Brown', email: 'oliver@example.com', roomType: 'Premier Room', room: '301', checkIn: '2026-11-20', checkOut: '2026-11-23', status: 'Checked-in', payment: 'Paid', total: 7350000, channel: 'Walk-in', notes: '' },
  { id: 'DGH-260106', guest: 'Linh Pham', email: 'linh@example.com', roomType: 'Deluxe Room', room: '204', checkIn: '2026-11-18', checkOut: '2026-11-21', status: 'Confirmed', payment: 'Pending', total: 5550000, channel: 'Website', notes: 'Late arrival' },
  { id: 'DGH-260107', guest: 'Isabella Rossi', email: 'isabella@example.com', roomType: 'Grand Suite', room: '403', checkIn: '2026-11-22', checkOut: '2026-11-25', status: 'Confirmed', payment: 'Paid', total: 12600000, channel: 'Website', notes: '' },
  { id: 'DGH-260108', guest: 'David Park', email: 'david@example.com', roomType: 'Premier Room', room: '303', checkIn: '2026-11-20', checkOut: '2026-11-22', status: 'Cancelled', payment: 'Refunded', total: 4900000, channel: 'Website', notes: '' },
];
export const demoPayments: Payment[] = [
  { id: 'PAY-9081', booking: 'DGH-260101', guest: 'Sophia Nguyen', amount: 16800000, method: 'Card', date: '2026-11-19', status: 'Paid', kind: 'Charge' },
  { id: 'PAY-9082', booking: 'DGH-260102', guest: 'Alex Chen', amount: 5550000, method: 'Card', date: '2026-11-19', status: 'Paid', kind: 'Charge' },
  { id: 'PAY-9083', booking: 'DGH-260103', guest: 'Emma Wilson', amount: 4900000, method: 'Transfer', date: '2026-11-20', status: 'Paid', kind: 'Deposit' },
  { id: 'PAY-9084', booking: 'DGH-260106', guest: 'Linh Pham', amount: 5550000, method: 'Card', date: '2026-11-20', status: 'Failed', kind: 'Charge' },
  { id: 'PAY-9085', booking: 'DGH-260108', guest: 'David Park', amount: -4900000, method: 'Card', date: '2026-11-20', status: 'Refunded', kind: 'Refund' },
];
export const demoGuests: Guest[] = [
  { name: 'Sophia Nguyen', email: 'sophia@example.com', visits: 4, spent: 43600000, type: 'Returning', note: 'Prefers quiet rooms' },
  { name: 'Alex Chen', email: 'alex@example.com', visits: 1, spent: 5550000, type: 'New', note: 'Airport pickup' },
  { name: 'Emma Wilson', email: 'emma@example.com', visits: 2, spent: 15350000, type: 'Returning', note: 'Celebrations' },
  { name: 'Minh Tran', email: 'minh@example.com', visits: 1, spent: 3700000, type: 'New', note: '' },
  { name: 'Oliver Brown', email: 'oliver@example.com', visits: 3, spent: 24250000, type: 'Returning', note: '' },
];
export const demoPromotions: Promotion[] = [
  { code: 'WELCOME10', type: 'Percent', value: 10, from: '2026-11-01', to: '2026-12-31', used: 28, limit: 100, status: 'Active' },
  { code: 'WEEKEND500', type: 'Fixed', value: 500000, from: '2026-11-15', to: '2026-12-15', used: 12, limit: 50, status: 'Active' },
  { code: 'SUITE15', type: 'Percent', value: 15, from: '2026-10-01', to: '2026-10-31', used: 35, limit: 40, status: 'Expired' },
];
export const demoServices: Service[] = [
  { name: 'Airport transfer', unit: 'Per ride', price: 650000, status: 'Active', category: 'Transport' },
  { name: 'Signature breakfast', unit: 'Per guest', price: 320000, status: 'Active', category: 'Dining' },
  { name: 'Spa ritual', unit: 'Per session', price: 1200000, status: 'Active', category: 'Wellness' },
  { name: 'Late check-out', unit: 'Per stay', price: 500000, status: 'Active', category: 'Stay' },
];
export const demoReviews: Review[] = [
  { guest: 'Sophia Nguyen', room: 'Grand Suite', stars: 5, date: '2026-11-17', text: 'Beautiful interiors and exceptionally attentive service.', reply: 'Thank you for staying with us.', status: 'Published' },
  { guest: 'Emma Wilson', room: 'Premier Room', stars: 4, date: '2026-11-12', text: 'A wonderful stay. Breakfast was a highlight.', reply: '', status: 'Awaiting reply' },
  { guest: 'Alex Chen', room: 'Deluxe Room', stars: 5, date: '2026-11-08', text: 'Comfortable, peaceful and thoughtfully designed.', reply: 'We hope to welcome you again.', status: 'Published' },
];
export const demoStaff: Staff[] = [
  { name: 'Hannah Le', role: 'Manager', email: 'hannah@dylangrand.example', status: 'Active', shift: 'Day' },
  { name: 'Daniel Pham', role: 'Receptionist', email: 'daniel@dylangrand.example', status: 'Active', shift: 'Morning' },
  { name: 'Thu Nguyen', role: 'Housekeeping', email: 'thu@dylangrand.example', status: 'Active', shift: 'Morning' },
  { name: 'Lucas Tran', role: 'Receptionist', email: 'lucas@dylangrand.example', status: 'Active', shift: 'Evening' },
];
