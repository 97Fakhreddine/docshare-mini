import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import {
  BaseModel,
  baseSchemaOptions,
  applyBaseSchema,
} from '../../core/schema/base.schema';

export enum ShareRole {
  VIEWER = 'VIEWER',
}
export type ShareDocument = HydratedDocument<Share>;

@Schema({ ...baseSchemaOptions, collection: 'shares' })
export class Share extends BaseModel {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  documentId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ enum: ShareRole, default: ShareRole.VIEWER })
  role!: ShareRole;
}

export const ShareSchema = SchemaFactory.createForClass(Share);
// ShareSchema.index({ documentId: 1, userId: 1 }, { unique: true });
applyBaseSchema(ShareSchema);
