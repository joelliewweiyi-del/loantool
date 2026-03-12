import { supabase } from '@/integrations/supabase/client';
import type { ActivityAttachment } from '@/types/loan';

const MAX_WIDTH = 1920;
const JPEG_QUALITY = 0.8;
const BUCKET = 'activity-photos';

/** Compress an image file to JPEG, max 1920px wide */
function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > MAX_WIDTH) {
        height = Math.round((height * MAX_WIDTH) / width);
        width = MAX_WIDTH;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas not supported'));
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Compression failed'))),
        'image/jpeg',
        JPEG_QUALITY
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

/** Upload a single photo to Supabase Storage, returns attachment metadata */
export async function uploadActivityPhoto(
  file: File,
  userId: string
): Promise<ActivityAttachment> {
  const compressed = await compressImage(file);
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${userId}/${timestamp}_${safeName}.jpg`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, compressed, {
      contentType: 'image/jpeg',
      upsert: false,
    });

  if (error) throw error;

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return {
    url: urlData.publicUrl,
    filename: file.name,
    type: 'image/jpeg',
    size: compressed.size,
  };
}

/** Upload multiple photos, returns array of attachment metadata */
export async function uploadActivityPhotos(
  files: File[],
  userId: string
): Promise<ActivityAttachment[]> {
  return Promise.all(files.map((f) => uploadActivityPhoto(f, userId)));
}
