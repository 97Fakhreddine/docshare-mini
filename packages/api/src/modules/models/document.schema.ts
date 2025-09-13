import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import {
  BaseModel,
  baseSchemaOptions,
  applyBaseSchema,
} from '../../core/schema/base.schema';

export type DocumentDocument = HydratedDocument<Document>;

@Schema({ ...baseSchemaOptions, collection: 'documents' })
export class Document extends BaseModel {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  ownerId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  filename!: string;

  @Prop({ required: true })
  mime!: string;

  @Prop({ required: true })
  size!: number;

  @Prop({ required: true })
  storageKey!: string;
}

export const DocumentSchema = SchemaFactory.createForClass(Document);
// DocumentSchema.index({ ownerId: 1, createdAt: -1 });
applyBaseSchema(DocumentSchema);
