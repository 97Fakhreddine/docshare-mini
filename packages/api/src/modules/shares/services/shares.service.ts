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
import type { Model } from 'mongoose';
import { Types } from 'mongoose';
import {
  DocumentDocument,
  Share,
  ShareDocument,
  ShareRole,
  User,
  UserDocument,
  Document,
} from '../../models';

@Injectable()
export class SharesService {
  private readonly logger = new Logger(SharesService.name);

  /**
   * SharesService
   *
   * description:
   * - Encapsulates the rules for **granting viewer access** to documents.
   * - Only a **document owner** may share a document.
   * - Recipients must be **registered users** (looked up by email).
   * - Operation is **idempotent** — re-sharing the same doc to the same user
   *   won’t duplicate the record (we use an upsert and gracefully handle races).
   *
   * Storage model (high-level):
   * - `documents` hold metadata (ownerId, filename, etc.)
   * - `users` are registered accounts
   * - `shares` links `{ documentId, userId, role: VIEWER }`
   */
  constructor(
    /** Share links (documentId ↔ userId). */
    @InjectModel(Share.name) private readonly shares: Model<ShareDocument>,
    /** Document metadata (to verify ownership). */
    @InjectModel(Document.name) private readonly docs: Model<DocumentDocument>,
    /** User accounts (to resolve recipient by email). */
    @InjectModel(User.name) private readonly users: Model<UserDocument>,
  ) {}

  /**
   * Share a document with a registered user (viewer-only).
   *
   * description (for the reviewer):
   * - Verifies the document exists and that the caller is the **owner**.
   * - Looks up the **recipient** by email (must already be registered).
   * - Creates (or verifies) a **viewer** share link for that recipient.
   * - **No-op** if the owner attempts to share to self.
   * - **Idempotent** and race-tolerant: duplicate key conflicts are treated as success.
   *
   * @param ownerId   Mongo ObjectId string of the caller (must own the document)
   * @param documentId Mongo ObjectId string of the document to share
   * @param targetEmail Recipient’s email (must belong to a registered user)
   * @returns `{ ok: true }` on success (created or already existed)
   *
   * @throws BadRequestException  when the document id format is invalid or email is empty
   * @throws NotFoundException    when the document or recipient doesn’t exist
   * @throws ForbiddenException   when the caller is not the document owner
   * @throws InternalServerErrorException on unexpected failures
   */
  async share(
    ownerId: string,
    documentId: string,
    targetEmail: string,
  ): Promise<{ ok: true }> {
    try {
      // Minimal input validation here (DTO should also validate).
      if (!Types.ObjectId.isValid(documentId)) {
        throw new BadRequestException('Invalid document id');
      }
      const normalizedEmail = (targetEmail ?? '').toLowerCase().trim();
      if (!normalizedEmail) {
        throw new BadRequestException('Invalid recipient email');
      }

      // Authorization: caller must own the document.
      const _docId = new Types.ObjectId(documentId);
      const doc = await this.docs.findById(_docId).lean();
      if (!doc) throw new NotFoundException('Document not found');
      if (doc.ownerId.toString() !== ownerId) {
        throw new ForbiddenException('Only the owner can share this document');
      }

      // Resolve recipient by email (must be registered).
      const target = await this.users
        .findOne({ email: normalizedEmail })
        .select({ _id: 1 })
        .lean();
      if (!target) throw new NotFoundException('Recipient not found');

      const targetId = (target as any)._id as Types.ObjectId;

      // No-op: ignore sharing to self.
      if (targetId.toString() === ownerId) {
        return { ok: true };
      }

      // Idempotent upsert: create the share if it doesn't exist.
      await this.shares.updateOne(
        { documentId: _docId, userId: targetId },
        { $setOnInsert: { role: ShareRole.VIEWER } },
        { upsert: true },
      );

      return { ok: true };
    } catch (e: any) {
      if (e instanceof HttpException) throw e;
      // Handle duplicate key races as success (idempotency).
      if (e?.code === 11000) return { ok: true };
      this.logger.error(`share failed: ${e?.message}`, e?.stack);
      throw new InternalServerErrorException('Share failed');
    }
  }
}
