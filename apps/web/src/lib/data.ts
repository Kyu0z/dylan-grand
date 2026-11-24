export type RoomId = 'deluxe' | 'premier' | 'suite';
export type Room = {
  id: RoomId;
  name: string;
  subtitle: string;
  size: number;
  guests: number;
  beds: string;
  view: string;
  price: number;
  available: number;
  description: string;
  amenities: string[];
  images: string[];
};
const photo = (id: string, w = 1200) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=85`;
export const photos = {
  hero: photo('photo-1566073771259-6a8506099945', 1800),
  lobby: photo('photo-1551882547-ff40c63fe5fa'),
  experience: photo('photo-1582719508461-905c673771fd'),
  facade: photo('photo-1542314831-068cd1dbfeeb'),
  dining: photo('photo-1517248135467-4c7edcad34c4'),
  pool: photo('photo-1571896349842-33c89424de2d'),
  interior: photo('photo-1564501049412-61c2a3083791'),
  wellness: photo('photo-1540555700478-4be289fbecef')
};
// Concept photos: distinct per room category; imagery never represents actual Dylan Grand inventory.
export const rooms: Room[] = [
  {
    id: 'deluxe',
    name: 'Deluxe Room',
    subtitle: 'The Essential',
    size: 32,
    guests: 2,
    beds: 'King bed',
    view: 'City view',
    price: 2250000,
    available: 3,
    images: [
      photo('photo-1590490360182-c33d57733427'),
      photo('photo-1631049307264-da0ec9d70304'),
      photo('photo-1582719478250-c89cae4dc85b')
    ],
    description: 'An intimate retreat with warm natural textures, bespoke details and restful city views.',
    amenities: ['Wi-Fi', 'Rain shower', 'Smart TV', 'Coffee & tea', 'Air conditioning', 'Workspace']
  },
  {
    id: 'premier',
    name: 'Premier Room',
    subtitle: 'The Refined',
    size: 40,
    guests: 3,
    beds: 'King or twin',
    view: 'Garden view',
    price: 3150000,
    available: 2,
    images: [
      photo('photo-1566665797739-1674de7a421a'),
      photo('photo-1595576508898-0ad5c879a061'),
      photo('photo-1618773928121-c32242e63f39')
    ],
    description: 'Generous proportions, carefully layered materials and thoughtful touches made for slower mornings.',
    amenities: ['Wi-Fi', 'Bathtub', 'Smart TV', 'Minibar', 'Air conditioning', 'Lounge area']
  },
  {
    id: 'suite',
    name: 'Grand Suite',
    subtitle: 'The Signature',
    size: 64,
    guests: 3,
    beds: 'King bed',
    view: 'Panoramic view',
    price: 4950000,
    available: 1,
    images: [
      photo('photo-1611892440504-42a792e24d32'),
      photo('photo-1591088398332-8a7791972843'),
      photo('photo-1596394516093-501ba68a0ba6')
    ],
    description: 'A private sanctuary of understated grandeur, with a dedicated living area and elevated hospitality.',
    amenities: ['Wi-Fi', 'Free-standing bath', 'Smart TV', 'Minibar', 'Private lounge', 'Coffee machine']
  }
];
export const services = [
  {
    id: 'breakfast',
    title: 'A leisurely breakfast',
    category: 'Dining',
    description: 'Begin your morning with a carefully prepared breakfast and an unhurried atmosphere.',
    image: photos.dining,
    price: 320000
  },
  {
    id: 'wellness',
    title: 'Wellness rituals',
    category: 'Wellbeing',
    description: 'Quiet moments and thoughtful rituals to restore your energy.',
    image: photos.wellness,
    price: 850000
  },
  {
    id: 'transfer',
    title: 'A seamless arrival',
    category: 'Travel',
    description: 'Arrive with ease with a private airport transfer.',
    image: photos.facade,
    price: 450000
  },
  {
    id: 'pool',
    title: 'Poolside afternoons',
    category: 'Leisure',
    description: 'Slow the day down in a sun-drenched poolside retreat.',
    image: photos.pool,
    price: 0
  }
];
export const money = (n: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);
export const dayISO = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const addDays = (iso: string, n: number) => {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return dayISO(d);
};
export const nights = (a: string, b: string) => Math.max(1, Math.round((new Date(b + 'T12:00:00').getTime() - new Date(a + 'T12:00:00').getTime()) / 86400000));
export const prettyDate = (s: string, locale: 'en' | 'vi' = 'en') => new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(s + 'T12:00:00'));
