export const ALLOWED_MIME = [
  'application/pdf',
  'image/png',
  'image/jpeg',
] as const;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB
export function isAllowedMime(mime: string) {
  return ALLOWED_MIME.includes(mime as any);
}

export const ACCEPTED_MIME = [
  'application/pdf',
  'image/png',
  'image/jpeg',
] as const;
