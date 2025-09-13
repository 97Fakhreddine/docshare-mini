import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

import * as bcrypt from 'bcryptjs';
import {
  applyBaseSchema,
  BaseModel,
  baseSchemaOptions,
} from '../../core/schema/base.schema';

export type UserDocument = HydratedDocument<User>;

@Schema({
  ...baseSchemaOptions,
  collection: 'users',
})
export class User extends BaseModel {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({
    type: String,
    required: true,
    unique: true,
    index: true,
    lowercase: true,
    trim: true,
  })
  email!: string;

  @Prop({ type: String })
  token?: string;

  @Prop({ type: String, required: true })
  password!: string;

  /** Optional instance helper, handy in services */
  async comparePassword(plain: string) {
    return bcrypt.compare(plain, this.password);
  }
}

const UserSchema = SchemaFactory.createForClass(User);

// ensure unique index (safety; unique: true already defines one)
// UserSchema.index({ email: 1 }, { unique: true });

// hash password only when modified; rounds from env
UserSchema.pre<UserDocument>('save', async function (next) {
  try {
    if (!this.isModified('password') || !this.password) return next();
    const rounds = Number(process.env.BCRYPT_ROUNDS ?? 10);
    this.password = await bcrypt.hash(this.password, rounds);
    next();
  } catch (err) {
    next(err as any);
  }
});

// apply base mixins (deleted flag, id virtual, indexes)
applyBaseSchema(UserSchema);

export { UserSchema };
