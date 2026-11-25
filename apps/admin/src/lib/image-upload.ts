export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_ROOM_IMAGES = 10;

export type ImageValidationError = 'count' | 'format' | 'size';

type ImageFile = Pick<File, 'type' | 'size'>;

export function validateImageFiles(
  files: readonly ImageFile[],
  existingCount: number,
  limit = MAX_ROOM_IMAGES,
): ImageValidationError | null {
  if (existingCount + files.length > limit) {
    return 'count';
  }

  for (const file of files) {
    if (!IMAGE_ACCEPT.split(',').includes(file.type)) {
      return 'format';
    }
    if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
      return 'size';
    }
  }

  return null;
}

export function moveImage<T>(items: readonly T[], from: number, to: number): T[] {
  if (
    !Number.isInteger(from) ||
    !Number.isInteger(to) ||
    from < 0 ||
    to < 0 ||
    from >= items.length ||
    to >= items.length ||
    from === to
  ) {
    return [...items];
  }

  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}

export function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Image could not be read.'));
      }
    };
    reader.onerror = () => reject(new Error('Image could not be read.'));
    reader.onabort = () => reject(new Error('Image could not be read.'));
    reader.readAsDataURL(file);
  });
}
