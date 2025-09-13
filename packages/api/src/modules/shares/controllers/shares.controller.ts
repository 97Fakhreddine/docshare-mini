import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SharesService } from '../services/shares.service';
import { CreateShareDto } from 'src/core/dtos/dto';
import { CurrentUser } from 'src/core/decorators/current-user.decorator';

/**
 * SharesController
 *
 * Human description:
 * Exposes a single endpoint that lets a document owner grant
 * **viewer-only** access to another **registered** user, identified
 * by their email. The operation is idempotent (re-sharing the same
 * document to the same recipient is a no-op).
 */
@ApiTags('Shares')
@ApiBearerAuth()
@Controller('shares')
export class SharesController {
  constructor(private readonly shares: SharesService) {}

  /**
   * Share a document with a registered user (viewer-only).
   *
   * Human description (for the reviewer):
   * - **Who can call:** Only the document **owner**.
   * - **Recipient:** Must already have an account (looked up by email).
   * - **Permission level:** Always **VIEWER**; never escalates privileges.
   * - **Idempotent:** If the share already exists, we return success semantics
   *   (or a 409 Conflict, depending on service policy). Either way, it’s safe
   *   for the frontend to retry.
   *
   * Body: {@link CreateShareDto} → `{ documentId, targetEmail }`
   * Returns: `{ ok: true }` when the share exists or is created.
   */
  @Post()
  @HttpCode(200)
  @ApiOperation({
    summary: 'Share a document with a registered user (viewer-only)',
  })
  @ApiOkResponse({
    description: 'Share created or already existed',
    schema: {
      type: 'object',
      properties: { ok: { type: 'boolean', example: true } },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid document id or email format' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  @ApiForbiddenResponse({
    description: 'Only the owner can share this document',
  })
  @ApiNotFoundResponse({ description: 'Document or recipient not found' })
  @ApiConflictResponse({
    description: 'Share already exists (idempotent conflict or ignored)',
  })
  create(@CurrentUser() user: { userId: string }, @Body() dto: CreateShareDto) {
    return this.shares.share(user.userId, dto.documentId, dto.targetEmail);
  }
}
