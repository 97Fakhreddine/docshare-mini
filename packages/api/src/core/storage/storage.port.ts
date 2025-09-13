export interface SaveInput {
  buffer: Buffer;
  contentType: string;
  suggestedName: string;
}
export interface SaveResult {
  key: string;
  size: number;
}
export interface StoragePort {
  save(input: SaveInput): Promise<SaveResult>;
  read(key: string): Promise<NodeJS.ReadableStream>;
}
export const STORAGE = Symbol('STORAGE');
