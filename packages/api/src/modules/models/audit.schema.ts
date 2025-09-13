import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import {
  BaseModel,
  baseSchemaOptions,
  applyBaseSchema,
} from '../../core/schema/base.schema';

export enum AuditEvent {
  VIEW = 'VIEW',
  DOWNLOAD = 'DOWNLOAD',
}

export type AuditDocument = HydratedDocument<Audit>;

@Schema({ ...baseSchemaOptions, collection: 'audits' })
export class Audit extends BaseModel {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  documentId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  actorId?: Types.ObjectId | null;

  @Prop({ enum: AuditEvent, required: true })
  event!: AuditEvent;
}

export const AuditSchema = SchemaFactory.createForClass(Audit);
// AuditSchema.index({ documentId: 1, createdAt: -1 });
applyBaseSchema(AuditSchema);
