/**
 * Re-encodes a photo as a JPEG at most `maxSide` pixels on its long side. Phone photos
 * shrink from 3–8 MB to a few hundred KB, and the hidden metadata (including GPS
 * position) is dropped. Returns the original file when it isn't a photo the browser can
 * decode (e.g. HEIC in some browsers) or when re-encoding wouldn't make it smaller.
 */
export async function shrinkImage(file: File, { maxSide = 1920, quality = 0.82 } = {}): Promise<File> {
  if (!/^image\/(jpeg|png|webp|heic|heif|avif|bmp)$/.test(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.fillStyle = "#fff"; // transparent PNGs would otherwise turn black
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob || blob.size >= file.size) return file;
    const name = `${file.name.replace(/\.[^.]+$/, "") || "photo"}.jpg`;
    return new File([blob], name, { type: "image/jpeg", lastModified: file.lastModified });
  } catch {
    return file;
  }
}
