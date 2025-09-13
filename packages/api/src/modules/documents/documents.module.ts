import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { STORAGE } from '../../core/storage/storage.port';
import { LocalDiskStorage } from '../../core/storage/local-disk.storage';
import { DocumentSchema, Document } from '../models/document.schema';
import { Audit, AuditSchema } from '../models/audit.schema';
import { DocumentsController } from './controllers/documents.controller';
import { DocumentsService } from './services/documents.service';
import { Share, ShareSchema } from '../models';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Document.name, schema: DocumentSchema },
      { name: Audit.name, schema: AuditSchema },
      { name: Share.name, schema: ShareSchema }, // used to compute "shared with me"
    ]),
  ],
  controllers: [DocumentsController],
  providers: [
    DocumentsService,
    { provide: STORAGE, useFactory: () => new LocalDiskStorage() },
  ],
})
export class DocumentsModule {}
