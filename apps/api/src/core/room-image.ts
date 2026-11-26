import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { createHash } from 'node:crypto';
export type RoomImageFile = {
  buffer: Buffer;
  mimetype: string;
  size: number;
};
export async function uploadRoomImage(file?: RoomImageFile, folder: 'dylan-grand/rooms' | 'dylan-grand/services' = 'dylan-grand/rooms') {
  const bytes = file?.buffer;
  if (!file || !bytes || file.size < 1 || file.size > 5 * 1024 * 1024) {
    throw new BadRequestException('Choose an image no larger than 5 MB.');
  }
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const webp = bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
  const mime = jpeg ? 'image/jpeg' : png ? 'image/png' : webp ? 'image/webp' : '';
  if (!mime || mime !== file.mimetype)
    throw new BadRequestException('Only JPEG, PNG and WebP images are allowed.');
  const cloud = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const key = process.env.CLOUDINARY_API_KEY?.trim();
  const secret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloud || !/^[a-zA-Z0-9_-]+$/.test(cloud) || !key || !secret) {
    throw new ServiceUnavailableException('Image storage is not configured.');
  }
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHash('sha1').update(`folder=${folder}&timestamp=${timestamp}${secret}`).digest('hex');
  const form = new FormData();
  form.append('file', new Blob([Uint8Array.from(bytes)], { type: mime }), `room.${jpeg ? 'jpg' : png ? 'png' : 'webp'}`);
  form.append('api_key', key);
  form.append('timestamp', timestamp);
  form.append('folder', folder);
  form.append('signature', signature);
  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
      method: 'POST', body: form, signal: AbortSignal.timeout(30000),
    });
    const result: unknown = await response.json();
    const record = result && typeof result === 'object' ? result as Record<string, unknown> : {};
    if (!response.ok || typeof record.secure_url !== 'string' || !record.secure_url.startsWith('https://')) {
      throw new Error('Invalid upload response');
    }
    return { url: record.secure_url, message: 'Image uploaded successfully.' };
  }
  catch {
    // Provider response may contain account details: never return it to a browser.
    throw new ServiceUnavailableException('Image upload failed. Please try again.');
  }
}
