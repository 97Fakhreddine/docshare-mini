export type Id = string;
export interface AuthTokens {
  accessToken: string;
}
export interface Me {
  id: Id;
  email: string;
  name: string;
}
export interface UploadedDocDto {
  id: Id;
  filename: string;
  mime: string;
  size: number;
  ownerId: Id;
  createdAt: string;
}
export interface AuditEntryDto {
  id: Id;
  documentId: Id;
  actorId?: Id | null;
  event: 'VIEW' | 'DOWNLOAD';
  createdAt: string;
}
export interface AuditListDto {
  total: number;
  counts: { VIEW: number; DOWNLOAD: number };
  items: AuditEntryDto[];
  nextCursor?: string | null;
}
