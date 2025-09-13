import {
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model, FilterQuery } from 'mongoose';
import { Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from 'src/modules/models';

/** Token shape returned by login/register */
export interface AuthToken {
  access_token: string;
}

/** Public shape of a user */
export interface SafeUser {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly jwtExpiresIn = '2h';
  private readonly rounds = Number(process.env.BCRYPT_ROUNDS ?? 10);

  constructor(
    @InjectModel(User.name) private readonly users: Model<UserDocument>,
    private readonly jwt: JwtService,
  ) {}

  /**
   * Register a new user (email must be unique).
   * - Hashing is done via the User schema pre-save hook
   * - On success, returns a short-lived JWT
   *
   * @throws ConflictException if email already exists (E11000)
   * @throws InternalServerErrorException on unexpected errors
   */
  async register(
    name: string,
    email: string,
    password: string,
  ): Promise<AuthToken> {
    try {
      const exists = await this.users.exists({ email } as FilterQuery<User>);
      if (exists) throw new ConflictException('Email already used');

      const user = new this.users({ name, email, password });
      await user.save();

      this.logger.log(`Registered user ${user.id} (${email})`);
      return this.issue(user.id.toString(), email);
    } catch (e: any) {
      if (e instanceof HttpException) throw e;
      if (this.isDuplicateKey(e))
        throw new ConflictException('Email already used');
      this.logger.error(`register error for ${email}: ${e?.message}`, e?.stack);
      throw new InternalServerErrorException('Registration failed');
    }
  }

  /**
   * Login using email + password.
   * - Validates hash with bcrypt
   * - Returns a short-lived JWT on success
   *
   * @throws UnauthorizedException on invalid credentials
   */
  async login(email: string, password: string): Promise<AuthToken> {
    try {
      const user = await this.users.findOne({ email } as FilterQuery<User>);
      const ok = !!user && (await bcrypt.compare(password, user.password));
      if (!ok) throw new UnauthorizedException('Invalid credentials');

      this.logger.log(`Login user ${user!.id} (${email})`);
      return this.issue(user!.id.toString(), user!.email);
    } catch (e: any) {
      if (e instanceof HttpException) throw e;
      this.logger.warn(`login error for ${email}: ${e?.message}`);
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  /**
   * Get the current user's public profile by their userId.
   * The usual caller is a controller guarded by JWT (userId from payload.sub).
   */
  async me(userId: string): Promise<SafeUser | null> {
    try {
      if (!Types.ObjectId.isValid(userId)) return null;
      const u = await this.users.findById(userId).lean<UserDocument>();
      return u ? this.toSafe(u) : null;
    } catch (e: any) {
      this.logger.error(`me error for ${userId}: ${e?.message}`, e?.stack);
      throw new InternalServerErrorException('Failed to load profile');
    }
  }

  /**
   * Get the current user profile directly from an Authorization header.
   * Useful for tools/tests that want to pass a Bearer token without using guards.
   *
   * @param authorization e.g. "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   * @throws UnauthorizedException if header/token is missing or invalid
   */
  async currentFromBearer(authorization?: string): Promise<SafeUser> {
    try {
      const token = this.extractBearer(authorization);
      const payload = await this.jwt.verifyAsync<{
        sub: string;
        email: string;
      }>(token, {
        ignoreExpiration: false,
        secret: process.env.JWT_SECRET,
      });
      const user = await this.me(payload.sub);
      if (!user) throw new UnauthorizedException('User not found');
      return user;
    } catch (e: any) {
      if (e instanceof HttpException) throw e;
      this.logger.warn(`currentFromBearer failed: ${e?.message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /** Issue a signed JWT for a user */
  private async issue(sub: string, email: string): Promise<AuthToken> {
    const access_token = await this.jwt.signAsync(
      { sub, email },
      { expiresIn: this.jwtExpiresIn },
    );
    return { access_token };
  }

  /** Convert a User (lean or doc) to the public shape */
  private toSafe(u: any): SafeUser {
    return {
      id: (u._id ?? u.id).toString(),
      name: u.name,
      email: u.email,
      createdAt: u.createdAt ?? new Date(0),
      updatedAt: u.updatedAt ?? u.createdAt ?? new Date(0),
    };
  }

  /** Extract the raw JWT from a standard Bearer header */
  private extractBearer(h?: string): string {
    const m = /^Bearer\s+(.+)$/i.exec(h ?? '');
    if (!m)
      throw new UnauthorizedException(
        'Missing or malformed Authorization header',
      );
    return m[1];
  }

  /** Detect Mongo duplicate key error (E11000) */
  private isDuplicateKey(err: any): boolean {
    return (
      err?.code === 11000 || /E11000 duplicate key/i.test(err?.message ?? '')
    );
  }
}
