import { http } from '@/lib/http';

export async function createShare(documentId: string, targetEmail: string) {
  const res = await http.post('/shares', { documentId, targetEmail });
  return res.data as { ok: true };
}
