// Set the expiration time to 30 days from now
// const expirationTime = '80h';
const expirationTime = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

export const jwtConstants = {
  secret: process.env['JWT_SECRET'] || 'saloum',
  signOptions: { expiresIn: expirationTime },
};

export interface ListItems {
  items: [];
  total: number;
}

export const ACCEPTED_MIME = [
  'application/pdf',
  'image/png',
  'image/jpeg',
] as const;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB
