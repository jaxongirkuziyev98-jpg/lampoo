import type { QuestionImageAttachment } from '../types/lesson';

export async function processQuestionImage(file: File): Promise<QuestionImageAttachment> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Iltimos, faqat rasm faylini tanlang (JPG, PNG, WebP).');
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error("Rasmni o'qib bo'lmadi."));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Rasm formati qo'llab-quvvatlanmadi."));
    el.src = dataUrl;
  });

  const maxDim = 1280;
  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;

  if (width > maxDim || height > maxDim) {
    const scale = maxDim / Math.max(width, height);
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    const comma = dataUrl.indexOf(',');
    return {
      base64: comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl,
      mimeType: file.type || 'image/jpeg',
      previewUrl: dataUrl,
      fileName: file.name || 'rasm.jpg',
    };
  }

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  const outputMime = 'image/jpeg';
  const compressedDataUrl = canvas.toDataURL(outputMime, 0.86);
  const commaIdx = compressedDataUrl.indexOf(',');
  const base64 = commaIdx >= 0 ? compressedDataUrl.slice(commaIdx + 1) : compressedDataUrl;

  return {
    base64,
    mimeType: outputMime,
    previewUrl: compressedDataUrl,
    fileName: file.name || 'masala.jpg',
  };
}
