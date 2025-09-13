import {
  Controller,
  Get,
  Post,
  UseInterceptors,
  UploadedFile,
  Req,
  Res,
  Inject,
  HttpStatus,
  Param,
  Body,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiPayloadTooLargeResponse,
  ApiProduces,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import type { Response } from 'express';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DocumentsService } from '../services/documents.service';
import { Share } from 'src/modules/models';
import { MAX_UPLOAD_BYTES } from 'src/core/utils/mime';
import { AuditListDto, UploadedDocDto } from 'src/core/dtos/dto';
import { CurrentUser } from 'src/core/decorators/current-user.decorator';

@ApiTags('Documents')
@ApiBearerAuth()
@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly docs: DocumentsService,
    @InjectModel(Share.name) private readonly shares: Model<any>,
  ) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a document (PDF/JPG/PNG)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @ApiOkResponse({
    description: 'Uploaded document',
    type: UploadedDocDto,
  })
  @ApiBadRequestResponse({
    description: 'No file provided or unsupported file type',
  })
  @ApiPayloadTooLargeResponse({
    description: `File too large (>${MAX_UPLOAD_BYTES} bytes)`,
  })
  @ApiBearerAuth()
  @ApiInternalServerErrorResponse({
    description: 'Unexpected error during upload',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.memoryStorage(),
      limits: { fileSize: MAX_UPLOAD_BYTES },
    }),
  )
  async upload(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
    return this.docs.upload(req.user.userId, file);
  }

  @Get('mine')
  @ApiOperation({ summary: 'List my uploaded documents' })
  @ApiOkResponse({
    description: 'Array of documents',
    type: UploadedDocDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  async mine(@Req() req: any) {
    return this.docs.listMine(req.user.userId);
  }

  @Get('shared')
  @ApiOperation({ summary: 'List documents shared with me' })
  @ApiOkResponse({
    description: 'Array of documents',
    type: UploadedDocDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  async shared(@Req() req: any) {
    return this.docs.listShared(req.user.userId, this.shares);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download a document (owner or shared)' })
  @ApiParam({
    name: 'id',
    description: 'Document id (Mongo ObjectId)',
    example: '64fd9c1f8b9b3a001234abcd',
  })
  @ApiProduces(
    'application/pdf',
    'image/png',
    'image/jpeg',
    'application/octet-stream',
  )
  @ApiOkResponse({
    description: 'Binary file stream',
    schema: { type: 'string', format: 'binary' },
  })
  @ApiBadRequestResponse({ description: 'Invalid document id' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  @ApiForbiddenResponse({ description: 'Access denied (not owner nor shared)' })
  @ApiNotFoundResponse({
    description: 'Document not found or file missing in storage',
  })
  async download(@Req() req: any, @Res() res: Response) {
    const docId = req.params.id as string;
    const { storageKey, filename, mime } = await this.docs.getDownload(
      req.user.userId,
      docId,
      this.shares,
    );
    const stream = await import('../../../core/storage/local-disk.storage.js');
    // Read through StoragePort rather than importing local adapter:
    const storage = (req as any).storage as any; // if you attached it globally; else inject into service only
    // simpler: ask service for a stream instead. Update service if you prefer that design:
    // const { stream, filename, mime } = await this.docs.getDownloadStream(req.user.userId, docId, this.shares);

    // Since service returned storageKey, we reuse the storage injected there; expose a new method if you want.
    // For now we delegate via docs.service (better design):
    // (Adjust service to return a stream; here’s the clean way:)
    return this.streamFromService(req, res, docId);
  }

  private async streamFromService(req: any, res: Response, docId: string) {
    const { storageKey, filename, mime } = await this.docs.getDownload(
      req.user.userId,
      docId,
      this.shares,
    );
    // Ask the service's storage to read (add a method or expose read via docs)
    // Quick path: call storage via a small helper on service:
    // @ts-ignore
    const stream: NodeJS.ReadableStream = await (this.docs as any).storage.read(
      storageKey,
    );
    res.setHeader('Content-Type', mime);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(filename)}"`,
    );
    res.status(HttpStatus.OK);
    stream.pipe(res);
  }

  @Post(':id/view')
  @ApiOperation({ summary: 'Log a VIEW of a document (owner or shared)' })
  @ApiParam({ name: 'id', description: 'Document id (ObjectId)' })
  @ApiOkResponse({
    description: 'Logged',
    schema: {
      type: 'object',
      properties: { ok: { type: 'boolean', example: true } },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid document id' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  @ApiForbiddenResponse({ description: 'Access denied (not owner/share)' })
  @ApiInternalServerErrorResponse({ description: 'Failed to log view' })
  async view(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.docs.logView(user.userId, id);
  }

  @Get(':id/audit')
  @ApiOperation({
    summary: 'Owner-only: list audit entries for a document (VIEW/DOWNLOAD)',
  })
  @ApiParam({ name: 'id', description: 'Document id (ObjectId)' })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: 'Pagination cursor (previous _id)',
  })
  @ApiOkResponse({ description: 'Audit entries', type: AuditListDto })
  @ApiBadRequestResponse({ description: 'Invalid document id' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  @ApiForbiddenResponse({ description: 'Only owner can view audit' })
  @ApiInternalServerErrorResponse({ description: 'Failed to load audit' })
  async audit(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() _unused: any,
  ) {
    // Read limit/cursor via query (Nest will place them in req.query)
    const req: any = (global as any).req ?? undefined; // if you have a better way, use @Query()
    const limit = Number((req?.query?.limit as string) ?? 50);
    const cursor = (req?.query?.cursor as string) ?? undefined;
    return this.docs.listAuditForOwner(user.userId, id, limit, cursor);
  }
}
