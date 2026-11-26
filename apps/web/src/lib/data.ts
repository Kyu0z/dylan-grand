export type RoomId = string;
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
// Editorial stock photography. Keep these separate from operational room images.
const pexels = (id: number, width: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${width}`;

export const photos = {
  hero: photo('photo-1566073771259-6a8506099945', 1800),
  lobby: photo('photo-1551882547-ff40c63fe5fa'),
  experience: photo('photo-1582719508461-905c673771fd'),
  facade: photo('photo-1542314831-068cd1dbfeeb'),
  dining: photo('photo-1517248135467-4c7edcad34c4'),
  pool: photo('photo-1571896349842-33c89424de2d'),
  interior: photo('photo-1564501049412-61c2a3083791'),
  wellness: photo('photo-1540555700478-4be289fbecef'),
  garden: photo('photo-1468824357306-a439d58ccb1c', 1600),
  coast: photo('photo-1506744038136-46273834b3fb', 1600),
  // British heritage stock alternative to the Estelle Manor reference.
  editorialHero: pexels(35497484, 2400),
  collectionExterior: pexels(11238596, 2000),
  collectionRoom: pexels(40624401, 1400),
  collectionLounge: pexels(7045699, 1400),
  collectionDining: pexels(31084649, 1400),
  collectionGarden: pexels(30193323, 1400),
  editorialDining: photo('photo-1551882547-ff40c63fe5fa', 1600),
  editorialExperience: photo('photo-1520250497591-112f2f40a3f4', 1800)
};
// Decorative fallback images only. Operational room data is loaded from the API.
export const roomArtwork = [
  {
    id: 'deluxe', images: [
      photo('photo-1590490360182-c33d57733427'),
      photo('photo-1631049307264-da0ec9d70304'),
      photo('photo-1582719478250-c89cae4dc85b')
    ]
  },
  {
    id: 'premier', images: [
      photo('photo-1566665797739-1674de7a421a'),
      photo('photo-1595576508898-0ad5c879a061'),
      photo('photo-1618773928121-c32242e63f39')
    ]
  },
  {
    id: 'suite', images: [
      photo('photo-1611892440504-42a792e24d32'),
      photo('photo-1591088398332-8a7791972843'),
      photo('photo-1596394516093-501ba68a0ba6')
    ]
  }
];
export const money = (n: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);
export const dayISO = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
export const addDays = (iso: string, n: number) => {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
export const nights = (a: string, b: string) => Math.max(1, Math.round((new Date(b + 'T12:00:00').getTime() - new Date(a + 'T12:00:00').getTime()) / 86400000));
export const prettyDate = (s: string, _locale: 'en' | 'vi' = 'en') => /^\d{4}-\d{2}-\d{2}$/.test(s.slice(0, 10)) ? s.slice(0, 10).split('-').reverse().join('/') : '—';
