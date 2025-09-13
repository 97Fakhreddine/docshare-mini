import { StoragePort, SaveInput, SaveResult } from './storage.port';
import { promises as fsp, createReadStream } from 'node:fs';
import { mkdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import { randomUUID } from 'node:crypto';

/**
 * LocalDiskStorage
 *
 * description:
 * A tiny, pluggable file storage adapter that writes uploaded bytes to a local
 * folder and returns a generated key you can use later to read/stream the file.
 *
 * Why it exists:
 * - Implements the {@link StoragePort} so the rest of the app doesn't know or care
 *   *where* bytes live (disk now, S3 later). This keeps controllers/services clean.
 * - Uses a UUID for the storage key to avoid filename collisions and path traversal.
 *
 * Default location:
 * - Uses `process.env.UPLOAD_DIR` if set, otherwise writes to `.uploads/`.
 *
 * Typical flow:
 * 1) Service validates the file (type/size), then calls `save(...)`.
 * 2) We persist the bytes to disk and return `{ key, size }`.
 * 3) Later, the service calls `read(key)` to stream the file to the client.
 */
export class LocalDiskStorage implements StoragePort {
  /**
   * @param baseDir Directory where files are stored (created if missing).
   *                Defaults to `process.env.UPLOAD_DIR || '.uploads'`.
   */
  constructor(private baseDir = process.env.UPLOAD_DIR || '.uploads') {
    // Ensure the storage directory exists on startup.
    mkdirSync(this.baseDir, { recursive: true });
  }

  /**
   * Persist an uploaded file to disk.
   *
   * Behavior:
   * - Derives a safe file extension from the original name or MIME type.
   * - Generates a **UUID** filename (no user-supplied paths are used).
   * - Writes raw bytes to `<baseDir>/<uuid>.<ext>`.
   *
   * @param input.buffer       Raw file bytes (e.g., from Multer memory storage).
   * @param input.contentType  MIME type (e.g., "application/pdf").
   * @param input.suggestedName Original client filename (used only to guess extension).
   *
   * @returns `{ key, size }` where:
   *   - `key` is the opaque filename to use when reading later
   *   - `size` is the byte size saved
   *
   * @example
   * const { key } = await storage.save({
   *   buffer: file.buffer,
   *   contentType: file.mimetype,
   *   suggestedName: file.originalname,
   * });
   */
  async save({
    buffer,
    contentType,
    suggestedName,
  }: SaveInput): Promise<SaveResult> {
    const ext = extname(suggestedName) || guessExt(contentType);
    const key = `${randomUUID()}${ext}`;
    const dest = join(this.baseDir, key);
    await fsp.writeFile(dest, buffer);
    return { key, size: buffer.length };
  }

  /**
   * Return a readable stream for a previously saved file.
   *
   * @param key The opaque key returned by {@link save}.
   * @returns A Node.js Readable stream you can pipe to the HTTP response.
   *
   * @example
   * const stream = await storage.read(key);
   * stream.pipe(res);
   */
  async read(key: string) {
    return createReadStream(join(this.baseDir, key));
  }
}

/**
 * Best-effort extension inference when the original filename has no extension.
 * Only handles the allowed types (PDF/PNG/JPEG). Returns empty string otherwise.
 *
 * @param mime MIME type (e.g., "image/png")
 * @returns e.g. ".png" | ".jpg" | ".pdf" | ""
 */
function guessExt(mime: string) {
  if (mime === 'application/pdf') return '.pdf';
  if (mime === 'image/png') return '.png';
  if (mime === 'image/jpeg') return '.jpg';
  return '';
}
