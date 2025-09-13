import { Schema as MongooseSchema, SchemaOptions } from 'mongoose';
import { Types, HydratedDocument } from 'mongoose';

/** Plain base model class: no Document inheritance, no real `id` column. */
export class BaseModel {
  _id!: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
  deleted?: boolean;
}

/** Helpful type you can reuse for any schema extending BaseModel */
export type BaseDoc<T extends BaseModel = BaseModel> = HydratedDocument<T>;

/** Common schema options you can spread into @Schema({...}) */
export const baseSchemaOptions: SchemaOptions = {
  timestamps: true,
  versionKey: false,
  toJSON: {
    virtuals: true,
    transform: (_doc, ret) => {
      // expose id as string, remove private fields
      (ret as any).id = ret._id?.toString?.() ?? ret._id;
      //@ts-ignore
      delete ret._id;
      //@ts-ignore
      delete ret?.__v;
      // strip password if present on a model
      if ('password' in ret) delete ret.password;
      return ret;
    },
  },
};

/** Apply base fields/mixins to a concrete schema */
export function applyBaseSchema(schema: MongooseSchema) {
  // soft delete flag
  schema.add({ deleted: { type: Boolean, default: false } });

  // id virtual (optional — toJSON above already sets it)
  schema.virtual('id').get(function () {
    return this._id?.toString?.();
  });

  // helpful index for soft-delete queries
  schema.index({ deleted: 1 });

  schema.pre(/^find/, function (next) {
    //@ts-ignore
    if (!('withDeleted' in (this.getOptions?.() ?? {}))) {
      //@ts-ignore
      this.where({ deleted: { $ne: true } });
    }
    next();
  });
}
