import type { Language } from './domain';

/** Labels have already been localized by the calling form. Explicit hints always win. */
export function fieldPlaceholder(language: Language, kind: string, label?: unknown, explicit?: string): string {
  if (explicit !== undefined) return explicit;
  const vi = language === 'vi';
  const title = typeof label === 'string' ? label.trim() : '';
  const lower = title ? title.charAt(0).toLocaleLowerCase(language) + title.slice(1) : '';
  if (kind === 'date') return 'DD/MM/YYYY';
  if (kind === 'datetime-local') return 'DD/MM/YYYY · HH:mm';
  if (kind === 'time') return 'HH:mm';
  if (kind === 'email') return 'name@example.com';
  if (kind === 'tel' || /^(phone|contact phone|điện thoại|số điện thoại)$/i.test(title)) return vi ? 'Nhập số điện thoại' : 'Enter phone number';
  if (kind === 'password') return vi ? 'Nhập mật khẩu' : 'Enter password';
  if (kind === 'select') return lower ? `${vi ? 'Chọn' : 'Select'} ${lower}` : vi ? 'Chọn giá trị' : 'Select an option';
  if (kind === 'search') return vi ? 'Tìm kiếm…' : 'Search…';
  if (/^(room number|inspected room number|số phòng|số phòng đã kiểm tra)$/i.test(title)) return vi ? 'VD: 201' : 'e.g. 201';
  if (/^(promotion code|mã ưu đãi|code \(uppercase\)|mã \(viết hoa\))$/i.test(title)) return vi ? 'VD: WELCOME10' : 'e.g. WELCOME10';
  if (/^(full name|guest name|họ tên|họ và tên|tên khách)$/i.test(title)) return vi ? 'Nhập họ và tên' : 'Enter full name';
  if (/^(rate name|tên đợt giá)$/i.test(title)) return vi ? 'VD: Giáng sinh' : 'e.g. Christmas';
  if (/^(amenities|tiện nghi)/i.test(title)) return vi ? 'Wi-Fi, điều hòa… (mỗi dòng một mục)' : 'Wi-Fi, air conditioning… (one per line)';
  if (/^(special requests|yêu cầu đặc biệt)$/i.test(title)) return vi ? 'VD: Phòng yên tĩnh' : 'e.g. A quiet room';
  if (/^(unit \(EN\)|đơn vị \(EN\))$/i.test(title)) return 'e.g. per guest';
  if (/^(unit \(VI\)|đơn vị \(VI\))$/i.test(title)) return 'VD: mỗi khách';
  if (/^(bank reference|mã giao dịch)/i.test(title)) return vi ? 'Nhập mã giao dịch ngân hàng' : 'Enter bank reference';
  if (kind === 'number') {
    const example = /discount|giảm|percentage|phần trăm/i.test(title) ? '10' : /hours|giờ/i.test(title) ? '48' : /usage limit|giới hạn lượt/i.test(title) ? '100' : /size|diện tích/i.test(title) ? '32' : /floor|tầng|guest|khách|adult|người lớn/i.test(title) ? '2' : /children|trẻ em/i.test(title) ? '0' : /quantity|số lượng|nights|số đêm/i.test(title) ? '1' : '';
    if (example) return `${vi ? 'VD:' : 'e.g.'} ${example}`;
  }
  if (kind === 'textarea' && !lower) return vi ? 'Nhập nội dung…' : 'Enter details…';
  return lower ? `${vi ? 'Nhập' : 'Enter'} ${lower}` : kind === 'number' ? (vi ? 'Nhập số' : 'Enter a number') : (vi ? 'Nhập giá trị' : 'Enter a value');
}
