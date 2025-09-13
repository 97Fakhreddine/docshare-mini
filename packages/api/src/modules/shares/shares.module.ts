import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  DocumentSchema,
  Share,
  ShareSchema,
  User,
  UserSchema,
  Document,
} from '../models';
import { SharesController } from './controllers/shares.controller';
import { SharesService } from './services/shares.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Share.name, schema: ShareSchema },
      { name: Document.name, schema: DocumentSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [SharesController],
  providers: [SharesService],
  exports: [SharesService],
})
export class SharesModule {}
