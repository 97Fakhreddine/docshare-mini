import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Inject } from '@nestjs/common';
import {
  Audit,
  AuditDocument,
  AuditEvent,
} from 'src/modules/models/audit.schema';
import { DocumentDocument, Document } from 'src/modules/models/document.schema';
import * as storagePort from 'src/core/storage/storage.port';
import { ACCEPTED_MIME } from 'src/core/utils/mime';
import { Share, ShareDocument } from 'src/modules/models';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);
  /**
   * Service responsible for everything related to documents:
   * - Validating and saving uploads (file bytes go to the storage adapter, metadata to Mongo)
   * - Listing documents (mine vs. shared with me)
   * - Authorizing and serving downloads (and logging the DOWNLOAD audit)
   * - Logging VIEW events and letting owners read the audit trail
   *
   * We keep I/O behind interfaces (Mongoose models, StoragePort) so the code stays testable.
   */
  constructor(
    /** Mongo model for document metadata (ownerId, filename, mime, storageKey, …). */
    @InjectModel(Document.name)
    private readonly docs: Model<DocumentDocument>,
    /** Mongo model for audit trail entries (VIEW/DOWNLOAD with actor + timestamps). */
    @InjectModel(Audit.name)
    private readonly audits: Model<AuditDocument>,
    /** Mongo model for share links (documentId ↔ userId with role=VIEWER). */
    @InjectModel(Share.name)
    private readonly shares: Model<ShareDocument>,
    /**
     * Pluggable storage (local disk, S3, …). The service never touches the filesystem
     * directly—only this port—so swapping adapters is trivial.
     */
    @Inject(storagePort.STORAGE)
    private readonly storage: storagePort.StoragePort,
  ) {}

  /**
   * Upload a single file for the given owner.
   *
   * description:
   * - Rejects missing files or unsupported MIME types.
   * - Streams the raw bytes to the configured storage adapter (not the database).
   * - Saves a small metadata record in Mongo (who owns it, how big it is, where to find the bytes).
   * - Returns a compact DTO the frontend can render immediately.
   *
   * @param ownerId Mongo ObjectId string of the uploading user
   * @param file Multer-provided file (we use memoryStorage in the controller)
   * @returns Minimal document DTO (id, filename, mime, size, ownerId, createdAt)
   *
   * @throws BadRequestException if the file is missing or its type isn’t allowed
   * @throws InternalServerErrorException on unexpected failures (storage/DB)
   */
  async upload(ownerId: string, file: Express.Multer.File) {
    try {
      if (!file) throw new BadRequestException('file is required');
      if (!ACCEPTED_MIME.includes(file.mimetype as any)) {
        throw new BadRequestException('Unsupported file type');
      }
      const { key, size } = await this.storage.save({
        buffer: file.buffer,
        contentType: file.mimetype,
        suggestedName: file.originalname,
      });

      const doc = await this.docs.create({
        ownerId: new (require('mongoose').Types.ObjectId)(ownerId),
        filename: file.originalname,
        mime: file.mimetype,
        size,
        storageKey: key,
      });

      return this.toDto(doc);
    } catch (e: any) {
      if (e instanceof HttpException) throw e;
      this.logger.error(`upload error: ${e?.message}`, e?.stack);
      throw new InternalServerErrorException('Upload failed');
    }
  }

  /**
   * List the caller’s own uploads.
   *
   * description:
   * - Simple ownerId filter.
   * - Sorted newest-first for a pleasant UX.
   *
   * @param userId Mongo ObjectId string of the owner
   * @returns Array of minimal document DTOs
   */
  async listMine(userId: string) {
    const ownerId = new (require('mongoose').Types.ObjectId)(userId);
    const items = await this.docs
      .find({ ownerId })
      .sort({ createdAt: -1 })
      .lean();
    return items.map(this.toDtoLean);
  }

  /**
   * List documents shared with the caller.
   *
   * description:
   * - Reads the "shares" collection to find links (documentId ↔ userId).
   * - Fetches those documents and returns the same lightweight DTOs.
   *
   * Note: this method accepts a `shares` model param for flexibility (e.g., old call sites).
   * In this service we also have `this.shares` injected and could use that instead.
   *
   * @param userId Mongo ObjectId string of the recipient
   * @param shares Mongoose model for Share (if provided by controller)
   * @returns Array of minimal document DTOs
   */
  async listShared(userId: string, shares: Model<any>) {
    const uid = new (require('mongoose').Types.ObjectId)(userId);
    const linkDocs = await shares.find({ userId: uid }).lean();
    const ids: Types.ObjectId[] = linkDocs.map((s: any) => s.documentId);
    if (ids.length === 0) return [];
    const items = await this.docs
      .find({ _id: { $in: ids } })
      .sort({ createdAt: -1 })
      .lean();
    return items.map(this.toDtoLean);
  }

  /**
   * Authorize and prepare a download.
   *
   * description:
   * - Verifies the document exists.
   * - Checks access: caller must be the owner or explicitly shared on this doc.
   * - Writes a DOWNLOAD audit entry (best-effort; logging failures won’t block the download).
   * - Returns the storage key + suggested filename/mime so the controller can stream bytes.
   *
   * @param userId Mongo ObjectId string of the caller
   * @param docId Mongo ObjectId string of the document
   * @param shares Mongoose model for Share (if provided by controller)
   * @returns { storageKey, filename, mime } — enough for the controller to stream the file
   *
   * @throws ForbiddenException if not found (to avoid leaking existence) or access is denied
   */
  async getDownload(userId: string, docId: string, shares: Model<any>) {
    const _id = new (require('mongoose').Types.ObjectId)(docId);
    const doc = await this.docs.findById(_id).lean();
    if (!doc) throw new ForbiddenException('Not found');

    const isOwner = doc.ownerId.toString() === userId;
    let isShared = false;
    if (!isOwner) {
      const uid = new (require('mongoose').Types.ObjectId)(userId);
      isShared = !!(await shares.exists({ documentId: _id, userId: uid }));
    }
    if (!isOwner && !isShared) throw new ForbiddenException('Access denied');

    try {
      await this.audits.create({
        documentId: _id,
        actorId: new (require('mongoose').Types.ObjectId)(userId),
        event: AuditEvent.DOWNLOAD,
      });
    } catch {
      /* ignore */
    }

    return {
      storageKey: doc.storageKey,
      filename: doc.filename,
      mime: doc.mime,
    };
  }

  /**
   * Log a VIEW event for a document, if the caller is allowed to see it.
   *
   * description:
   * - Same access rules as download (owner or shared).
   * - Records a lightweight audit entry (documentId, actorId, event, timestamp).
   * - Returns `{ ok: true }` so the frontend can fire-and-forget.
   *
   * @param userId Mongo ObjectId string of the viewer
   * @param docId Mongo ObjectId string of the document
   * @returns `{ ok: true }` on success
   *
   * @throws BadRequestException invalid id format
   * @throws NotFoundException document doesn’t exist
   * @throws ForbiddenException caller lacks access
   * @throws InternalServerErrorException unexpected failures
   */
  async logView(userId: string, docId: string): Promise<{ ok: true }> {
    try {
      if (!Types.ObjectId.isValid(docId)) {
        throw new BadRequestException('Invalid document id');
      }
      const _id = new Types.ObjectId(docId);
      const doc = await this.docs.findById(_id).lean();
      if (!doc) throw new NotFoundException('Document not found');

      const isOwner = doc.ownerId.toString() === userId;
      let isShared = false;
      if (!isOwner) {
        const uid = new Types.ObjectId(userId);
        isShared = !!(await this.shares.exists({
          documentId: _id,
          userId: uid,
        }));
      }
      if (!isOwner && !isShared) throw new ForbiddenException('Access denied');

      await this.audits.create({
        documentId: _id,
        actorId: new Types.ObjectId(userId),
        event: AuditEvent.VIEW,
      });
      return { ok: true };
    } catch (e: any) {
      if (e instanceof HttpException) throw e;
      this.logger.error(`logView error: ${e?.message}`, e?.stack);
      throw new InternalServerErrorException('Failed to log view');
    }
  }

  /**
   * Owner-only audit browser with simple cursor pagination.
   *
   * description:
   * - Only the document owner can see audit history.
   * - Returns a total count, per-type counts (VIEW/DOWNLOAD), the current page of entries,
   *   and a `nextCursor` you can pass back to get older rows (infinite scroll style).
   *
   * @param ownerId Mongo ObjectId string of the owner
   * @param docId Mongo ObjectId string of the document
   * @param limit Page size (1..200; defaults to 50)
   * @param cursor Optional cursor (the `_id` of the last entry from the previous page)
   * @returns `{ total, counts: {VIEW, DOWNLOAD}, items, nextCursor }`
   *
   * @throws BadRequestException invalid id format
   * @throws NotFoundException document doesn’t exist
   * @throws ForbiddenException caller is not the owner
   * @throws InternalServerErrorException unexpected failures
   */
  async listAuditForOwner(
    ownerId: string,
    docId: string,
    limit = 50,
    cursor?: string,
  ): Promise<{
    total: number;
    counts: Record<'VIEW' | 'DOWNLOAD', number>;
    items: any[];
    nextCursor?: string | null;
  }> {
    try {
      if (!Types.ObjectId.isValid(docId))
        throw new BadRequestException('Invalid document id');
      const _id = new Types.ObjectId(docId);
      const doc = await this.docs.findById(_id).select({ ownerId: 1 }).lean();
      if (!doc) throw new NotFoundException('Document not found');
      if (doc.ownerId.toString() !== ownerId)
        throw new ForbiddenException('Only owner can view audit');

      const query: any = { documentId: _id };
      if (cursor && Types.ObjectId.isValid(cursor)) {
        query._id = { $lt: new Types.ObjectId(cursor) }; // paginate by _id desc
      }

      const [items, total, countsAgg] = await Promise.all([
        this.audits
          .find(query)
          .sort({ _id: -1 })
          .limit(Math.max(1, Math.min(limit, 200)))
          .lean(),
        this.audits.countDocuments({ documentId: _id }),
        this.audits.aggregate([
          { $match: { documentId: _id } },
          { $group: { _id: '$event', n: { $sum: 1 } } },
        ]),
      ]);

      const counts: any = { VIEW: 0, DOWNLOAD: 0 };
      for (const c of countsAgg) counts[c._id] = c.n;

      const nextCursor = items.length
        ? items[items.length - 1]._id.toString()
        : null;

      return {
        total,
        counts,
        items: items.map((a) => ({
          id: a._id.toString(),
          documentId: a.documentId.toString(),
          actorId: a.actorId ? a.actorId.toString() : null,
          event: a.event,
          createdAt: a.createdAt,
        })),
        nextCursor,
      };
    } catch (e: any) {
      if (e instanceof HttpException) throw e;
      this.logger.error(`listAuditForOwner error: ${e?.message}`, e?.stack);
      throw new InternalServerErrorException('Failed to load audit');
    }
  }
  /**
   * Map a live Mongoose document to a minimal DTO.
   * We keep the DTO intentionally small so the frontend has an easy shape to work with.
   */
  private toDto(doc: DocumentDocument) {
    return {
      id: doc.id.toString(),
      filename: doc.filename,
      mime: doc.mime,
      size: doc.size,
      ownerId: doc.ownerId.toString(),
      createdAt: doc.createdAt!,
    };
  }
  /**
   * Same as {@link toDto} but accepts `.lean()` result objects (plain JS).
   */
  private toDtoLean = (d: any) => ({
    id: d._id.toString(),
    filename: d.filename,
    mime: d.mime,
    size: d.size,
    ownerId: d.ownerId.toString(),
    createdAt: d.createdAt,
  });
}
