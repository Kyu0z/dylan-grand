export type RoomId = 'deluxe' | 'premier' | 'suite' | 'terrace';
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

const photo = (id: string, w = 1400) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=85`;

export const photos = {
  hero: photo('photo-1512918728675-ed5a9ecdebfd', 2000),
  lobby: photo('photo-1505693416388-ac5ce068fe85', 1600),
  experience: photo('photo-1520250497591-112f2f40a3f4', 1800),
  facade: photo('photo-1445019980597-93fa8acb246c', 1800),
  dining: photo('photo-1551882547-ff40c63fe5fa', 1600),
  pool: photo('photo-1578683010236-d716f9a3f461', 1800),
  interior: photo('photo-1505693416388-ac5ce068fe85', 1600),
  wellness: photo('photo-1544161515-4ab6ce6db874', 1600),
  lounge: photo('photo-1522798514-97ceb8c4f1c8', 1600),
  garden: photo('photo-1468824357306-a439d58ccb1c', 1600),
  library: photo('photo-1522708323590-d24dbb6b0267', 1600),
  coast: photo('photo-1506744038136-46273834b3fb', 1600)
};

// Concept photography only. Distinct imagery per room category for portfolio presentation.
export const rooms: Room[] = [
  {
    id: 'deluxe',
    name: 'Deluxe Room',
    subtitle: 'The Essential',
    size: 32,
    guests: 2,
    beds: 'King bed',
    view: 'Garden view',
    price: 2250000,
    available: 3,
    images: [
      photo('photo-1590490360182-c33d57733427'),
      photo('photo-1631049307264-da0ec9d70304'),
      photo('photo-1582719478250-c89cae4dc85b')
    ],
    description: 'An intimate retreat with warm natural textures, tailored details and a calm garden outlook.',
    amenities: ['Wi-Fi', 'Rain shower', 'Smart TV', 'Coffee & tea', 'Air conditioning', 'Workspace']
  },
  {
    id: 'terrace',
    name: 'Terrace Studio',
    subtitle: 'The Garden',
    size: 38,
    guests: 2,
    beds: 'King or twin',
    view: 'Garden view',
    price: 2890000,
    available: 2,
    images: [
      photo('photo-1566665797739-1674de7a421a'),
      photo('photo-1616594039964-3b01b1c3c6f0'),
      photo('photo-1505693416388-ac5ce068fe85')
    ],
    description: 'A bright studio with a sheltered terrace, soft layered finishes and an easy sense of retreat.',
    amenities: ['Wi-Fi', 'Rain shower', 'Smart TV', 'Coffee & tea', 'Workspace', 'Lounge area']
  },
  {
    id: 'premier',
    name: 'Premier Room',
    subtitle: 'The Refined',
    size: 42,
    guests: 3,
    beds: 'King or twin',
    view: 'Panoramic view',
    price: 3150000,
    available: 2,
    images: [
      photo('photo-1595576508898-0ad5c879a061'),
      photo('photo-1618773928121-c32242e63f39'),
      photo('photo-1566665797739-1674de7a421a')
    ],
    description: 'Generous proportions, layered materials and beautifully considered comforts made for slower mornings.',
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
    description: 'A private sanctuary of understated grandeur, with a dedicated living area and quietly elevated hospitality.',
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

export const money = (n: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(n);

export const dayISO = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const addDays = (iso: string, n: number) => {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return dayISO(d);
};

export const nights = (a: string, b: string) =>
  Math.max(1, Math.round((new Date(b + 'T12:00:00').getTime() - new Date(a + 'T12:00:00').getTime()) / 86400000));

export const prettyDate = (s: string, locale: 'en' | 'vi' = 'en') =>
  new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(s + 'T12:00:00'));
