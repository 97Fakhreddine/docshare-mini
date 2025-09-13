import * as Joi from 'joi';

/**
 * Environment variables schema (validated at bootstrap).
 *
 * description:
 * - We validate all required configuration up front so the app **fails fast**
 *   with a clear error instead of crashing later at runtime.
 * - This makes deployments safer and debugging easier (e.g., missing JWT secret
 *   or wrong Mongo URI is caught immediately).
 *
 * Variables:
 * - NODE_ENV       : runtime mode (development/test/production). Defaults to "development".
 * - MONGODB_URI    : MongoDB connection string (required). Example: "mongodb://127.0.0.1:27017/docshare-mini"
 * - JWT_SECRET     : HMAC secret used to sign/verify JWT access tokens (required, min length 16).
 * - BCRYPT_ROUNDS  : Work factor for password hashing (bcrypt). Defaults to 10; bounded to [8..14] for sensible performance.
 *
 * Usage:
 * - Wired into Nest's ConfigModule:
 *     ConfigModule.forRoot({ isGlobal: true, validationSchema: envValidation })
 * - Any missing/invalid value throws a descriptive error during app startup.
 */
export const envValidation = Joi.object({
  /** Runtime environment hint used by logging, tuning, and guards. */
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),

  /** Full MongoDB connection string (driver parses db name from the URI). */
  MONGODB_URI: Joi.string().uri().required(),

  /**
   * JWT signing secret.
   * Minimum of 16 chars to avoid trivially weak tokens (longer is better; consider 32+).
   * Keep this out of source control and rotate as needed.
   */
  JWT_SECRET: Joi.string().min(16).required(),

  /**
   * Bcrypt cost factor (2^rounds).
   * Higher = slower but stronger; keep within a sane range for server latency.
   * Defaults to 10 which is a good trade-off for small workloads.
   */
  BCRYPT_ROUNDS: Joi.number().integer().min(8).max(14).default(10),
}).unknown(true); // allow extra vars so platforms like Vercel/Heroku don’t break
